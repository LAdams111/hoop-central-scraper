/**
 * Basketball Reference API client for use in your JavaScript website.
 * Point baseUrl to your running scraper API (see README).
 *
 * Usage:
 *   import { getPlayerStats, getTeamStats } from './basketball-reference-client.js';
 *   const player = await getPlayerStats('jamesle01', { baseUrl: 'http://localhost:3001' });
 *   const team = await getTeamStats('LAL', 2025, { baseUrl: 'http://localhost:3001' });
 */

/**
 * @param {string} playerId - Basketball Reference player id (e.g. 'jamesle01')
 * @param {{ baseUrl?: string }} [options] - baseUrl of your scraper API (default: same origin)
 * @returns {Promise<Object>} Player info and stats
 */
export async function getPlayerStats(playerId, options = {}) {
  const base = (options.baseUrl || '').replace(/\/$/, '');
  const url = base ? `${base}/api/player/${encodeURIComponent(playerId)}` : `/api/player/${encodeURIComponent(playerId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * @param {string} teamId - Team abbreviation (e.g. 'LAL', 'BOS')
 * @param {number|string|{ baseUrl?: string }} [seasonOrOptions] - Season year (e.g. 2025) or options. Omit for current season.
 * @param {{ baseUrl?: string }} [options] - baseUrl of your scraper API (if season provided)
 * @returns {Promise<Object>} Team info, record, and roster stats
 */
export async function getTeamStats(teamId, seasonOrOptions, options = {}) {
  const isSeason = seasonOrOptions != null && typeof seasonOrOptions !== 'object';
  const season = isSeason ? seasonOrOptions : undefined;
  const opts = isSeason ? options : (seasonOrOptions || {});
  const base = (opts.baseUrl || '').replace(/\/$/, '');
  const path = season != null
    ? `/api/team/${encodeURIComponent(teamId)}/${encodeURIComponent(season)}`
    : `/api/team/${encodeURIComponent(teamId)}`;
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * List players from Postgres (after sync). Use this on your main site to display all players.
 * @param {{ baseUrl?: string, limit?: number, offset?: number }} [options]
 * @returns {Promise<{ players: Array, total: number, limit: number, offset: number }>}
 */
export async function getPlayersFromDB(options = {}) {
  const { baseUrl = '', limit = 5000, offset = 0 } = options;
  const base = (baseUrl || '').replace(/\/$/, '');
  const url = base ? `${base}/api/players?limit=${limit}&offset=${offset}` : `/api/players?limit=${limit}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Get one player from Postgres by Basketball Reference player id.
 * @param {string} playerId - e.g. 'jamesle01'
 * @param {{ baseUrl?: string }} [options]
 * @returns {Promise<Object>} Player row from DB
 */
export async function getPlayerFromDB(playerId, options = {}) {
  const base = (options.baseUrl || '').replace(/\/$/, '');
  const url = base ? `${base}/api/players/${encodeURIComponent(playerId)}` : `/api/players/${encodeURIComponent(playerId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export default { getPlayerStats, getTeamStats, getPlayersFromDB, getPlayerFromDB };
