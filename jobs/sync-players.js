/**
 * Fetches all NBA player IDs from Basketball Reference index pages (a-z),
 * then fetches each player's page in small batches with delay to avoid 429.
 */

const BASE = 'https://www.basketball-reference.com';
const USER_AGENT = 'Mozilla/5.0 (compatible; BasketballStatsBot/1.0)';
const BATCH_SIZE = 20;
const DELAY_MS = 2000;
const INDEX_DELAY_MS = 1500;

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getAllPlayerIdsFromIndex(fetchHtmlFn, parsePlayersIndex) {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const all = [];
  for (const letter of letters) {
    try {
      const url = `${BASE}/players/${letter}/`;
      const html = await fetchHtmlFn(url);
      const players = parsePlayersIndex(html, letter);
      all.push(...players);
      await sleep(INDEX_DELAY_MS);
    } catch (e) {
      console.warn(`Failed to fetch letter ${letter}:`, e.message);
    }
  }
  return all;
}

export async function syncPlayersInBatches(
  playerIdList,
  fetchHtmlFn,
  parsePlayerPage,
  upsertPlayer,
  options = {}
) {
  const { batchSize = BATCH_SIZE, delayMs = DELAY_MS, onProgress } = options;
  let processed = 0;
  let errors = 0;
  for (let i = 0; i < playerIdList.length; i += batchSize) {
    const batch = playerIdList.slice(i, i + batchSize);
    for (const { playerId } of batch) {
      try {
        const firstChar = playerId.charAt(0).toLowerCase();
        const url = `${BASE}/players/${firstChar}/${playerId}.html`;
        const html = await fetchHtmlFn(url);
        const data = parsePlayerPage(html, playerId);
        await upsertPlayer(data);
        processed++;
      } catch (e) {
        errors++;
        console.warn(`Failed to sync ${playerId}:`, e.message);
      }
      await sleep(delayMs);
    }
    if (onProgress) onProgress({ processed, total: playerIdList.length, errors });
  }
  return { processed, errors };
}
