import pg from 'pg';

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL or POSTGRES_URL must be set for database operations');
    }
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function query(text, params) {
  const p = getPool();
  return p.query(text, params);
}

// Uses your Railway table "Player info" (columns: id, player_id, name, team, position, height, weight, summary, raw_data).
// raw_data stores { per_game, url } as JSON.

/** Upsert one player into "Player info". Works with or without UNIQUE(player_id). */
export async function upsertPlayer(row) {
  const rawData = { per_game: row.perGame || [], url: row.url || null };
  const params = [
    row.playerId,
    row.name ?? null,
    row.team ?? null,
    row.position ?? null,
    row.height ?? null,
    row.weight ?? null,
    JSON.stringify(row.summary || {}),
    JSON.stringify(rawData),
  ];
  const existing = await query(
    `SELECT id FROM "Player info" WHERE player_id = $1`,
    [row.playerId]
  );
  if (existing.rows.length > 0) {
    await query(
      `UPDATE "Player info" SET name = $2, team = $3, position = $4, height = $5, weight = $6, summary = $7::jsonb, raw_data = $8::jsonb WHERE player_id = $1`,
      params
    );
  } else {
    await query(
      `INSERT INTO "Player info" (player_id, name, team, position, height, weight, summary, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)`,
      params
    );
  }
}

/** Get all players (optional pagination). Returns shape with per_game and url from raw_data. */
export async function getPlayers(limit = 5000, offset = 0) {
  const r = await query(
    `SELECT player_id, name, team, position, height, weight, summary, raw_data FROM "Player info" ORDER BY name LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return r.rows.map((row) => ({
    ...row,
    per_game: row.raw_data?.per_game ?? [],
    url: row.raw_data?.url ?? null,
    raw_data: undefined,
  }));
}

/** Get one player by Basketball Reference player_id. */
export async function getPlayerByPlayerId(playerId) {
  const r = await query(
    `SELECT player_id, name, team, position, height, weight, summary, raw_data FROM "Player info" WHERE player_id = $1`,
    [playerId]
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    ...row,
    per_game: row.raw_data?.per_game ?? [],
    url: row.raw_data?.url ?? null,
    raw_data: undefined,
  };
}

/** Count players in DB. */
export async function countPlayers() {
  const r = await query('SELECT COUNT(*)::int AS count FROM "Player info"');
  return r.rows[0].count;
}
