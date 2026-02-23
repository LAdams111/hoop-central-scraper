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
  // Also write one row per season into player_stats (don't fail Player info if this errors)
  try {
    await upsertPlayerStats(row.playerId, row.perGame || []);
  } catch (err) {
    console.error(`player_stats write failed for ${row.playerId}:`, err.message);
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

// --- player_stats table: one row per season per player (season-level stats) ---

/** Map scraped per_game row to player_stats columns. */
function mapPerGameToStats(playerId, row) {
  const season = row.season ?? row.year_id ?? null;
  const team = row.team_id ?? row.team_name_abbr ?? row.team ?? null;
  const league = row.comp_name_abbr ?? row.lg_id ?? row.league ?? null;
  return {
    player_id: playerId,
    season,
    team,
    league,
    games: row.games != null ? Number(row.games) : null,
    games_started: row.games_started != null ? Number(row.games_started) : null,
    pts_per_g: row.pts_per_g != null ? Number(row.pts_per_g) : null,
    trb_per_g: row.trb_per_g != null ? Number(row.trb_per_g) : null,
    ast_per_g: row.ast_per_g != null ? Number(row.ast_per_g) : null,
    stl_per_g: row.stl_per_g != null ? Number(row.stl_per_g) : null,
    blk_per_g: row.blk_per_g != null ? Number(row.blk_per_g) : null,
    fg_pct: row.fg_pct != null ? Number(row.fg_pct) : null,
    fg3_pct: row.fg3_pct != null ? Number(row.fg3_pct) : null,
    ft_pct: row.ft_pct != null ? Number(row.ft_pct) : null,
  };
}

// Table name: Railway may create "player_stats" (lowercase) or "Player stats" (with space)
const PLAYER_STATS_TABLE = process.env.PLAYER_STATS_TABLE || 'player_stats';

/** Insert all season stats for a player into player_stats. Replaces existing rows for this player_id. */
export async function upsertPlayerStats(playerId, perGameRows) {
  if (!perGameRows || perGameRows.length === 0) return;
  const table = PLAYER_STATS_TABLE.includes(' ') ? `"${PLAYER_STATS_TABLE}"` : PLAYER_STATS_TABLE;
  await query(`DELETE FROM ${table} WHERE player_id = $1`, [playerId]);
  const cols = 'player_id, season, team, league, games, games_started, pts_per_g, trb_per_g, ast_per_g, stl_per_g, blk_per_g, fg_pct, fg3_pct, ft_pct';
  const placeholders = [];
  const values = [];
  let i = 0;
  for (const row of perGameRows) {
    const s = mapPerGameToStats(playerId, row);
    const seasonStr = s.season != null ? String(s.season).trim() : '';
    if (!seasonStr) continue;
    if (!/^\d{4}(-\d{2})?$/.test(seasonStr) && !/^(19|20)\d{2}/.test(seasonStr)) continue;
    placeholders.push(
      `($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5}, $${i + 6}, $${i + 7}, $${i + 8}, $${i + 9}, $${i + 10}, $${i + 11}, $${i + 12}, $${i + 13}, $${i + 14})`
    );
    values.push(
      s.player_id, s.season, s.team, s.league, s.games, s.games_started,
      s.pts_per_g, s.trb_per_g, s.ast_per_g, s.stl_per_g, s.blk_per_g,
      s.fg_pct, s.fg3_pct, s.ft_pct
    );
    i += 14;
  }
  if (placeholders.length === 0) return;
  await query(
    `INSERT INTO ${table} (${cols}) VALUES ${placeholders.join(', ')}`,
    values
  );
}
