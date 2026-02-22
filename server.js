import express from 'express';
import cors from 'cors';
import { parsePlayerPage } from './scraper/player.js';
import { parseTeamPage } from './scraper/team.js';
import { parsePlayersIndex } from './scraper/players-index.js';
import { getAllPlayerIdsFromIndex, syncPlayersInBatches } from './jobs/sync-players.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const USER_AGENT = 'Mozilla/5.0 (compatible; BasketballStatsBot/1.0; +https://github.com/your-repo)';

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

// --- Optional Postgres (for /api/players and sync) ---
let db = null;
if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
  try {
    const client = await import('./db/client.js');
    db = {
      getPlayers: client.getPlayers,
      getPlayerByPlayerId: client.getPlayerByPlayerId,
      upsertPlayer: client.upsertPlayer,
      countPlayers: client.countPlayers,
    };
  } catch (e) {
    console.warn('Database module failed:', e.message);
  }
}
if (!db) console.warn('DATABASE_URL not set. /api/players and sync disabled.');

// Sync state (in-memory)
let syncStatus = { running: false, processed: 0, total: 0, errors: 0, message: null };

async function runSync() {
  if (!db) return;
  if (syncStatus.running) return;
  syncStatus = { running: true, processed: 0, total: 0, errors: 0, message: 'Fetching player list...' };
  try {
    const list = await getAllPlayerIdsFromIndex(fetchHtml, parsePlayersIndex);
    syncStatus.total = list.length;
    syncStatus.message = `Syncing ${list.length} players in batches of 100...`;
    const result = await syncPlayersInBatches(
      list,
      fetchHtml,
      parsePlayerPage,
      db.upsertPlayer,
      { batchSize: 100, delayMs: 800, onProgress: (p) => { syncStatus.processed = p.processed; syncStatus.errors = p.errors; } }
    );
    syncStatus.message = `Done. Synced ${result.processed}, ${result.errors} errors.`;
  } catch (e) {
    syncStatus.message = `Error: ${e.message}`;
    console.error('Sync error:', e);
  } finally {
    syncStatus.running = false;
  }
}

// --- Players from DB (for main website) ---

// GET /api/players?limit=100&offset=0  – list players from Postgres
app.get('/api/players', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 5000, 10000);
    const offset = parseInt(req.query.offset, 10) || 0;
    const players = await db.getPlayers(limit, offset);
    const total = await db.countPlayers();
    res.json({ players, total, limit, offset });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Failed to fetch players' });
  }
});

// GET /api/players/:playerId  – one player from Postgres (for main site)
app.get('/api/players/:playerId', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  try {
    const player = await db.getPlayerByPlayerId(req.params.playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Failed to fetch player' });
  }
});

// POST /api/players/sync  – start full sync (100 at a time until all in Postgres)
app.post('/api/players/sync', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  if (syncStatus.running) {
    return res.status(409).json({ message: 'Sync already running', status: syncStatus });
  }
  runSync(); // fire-and-forget
  res.status(202).json({ message: 'Sync started. Check GET /api/players/sync/status for progress.', status: syncStatus });
});

// GET /api/players/sync/status
app.get('/api/players/sync/status', (req, res) => {
  res.json(syncStatus);
});

// --- Live scrape (existing behavior) ---

// GET /api/player/:playerId  – live scrape one player (Basketball Reference)
app.get('/api/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const firstChar = playerId.charAt(0).toLowerCase();
    const url = `https://www.basketball-reference.com/players/${firstChar}/${playerId}.html`;
    const html = await fetchHtml(url);
    const data = parsePlayerPage(html, playerId);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(e.message?.startsWith('HTTP') ? 502 : 500).json({
      error: e.message || 'Failed to fetch player',
    });
  }
});

// GET /api/team/:teamId/:season?
app.get('/api/team/:teamId/:season?', async (req, res) => {
  try {
    const { teamId, season } = req.params;
    const year = season || new Date().getFullYear() + (new Date().getMonth() >= 9 ? 1 : 0);
    const url = `https://www.basketball-reference.com/teams/${teamId.toUpperCase()}/${year}.html`;
    const html = await fetchHtml(url);
    const data = parseTeamPage(html, teamId.toUpperCase(), year);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(e.message?.startsWith('HTTP') ? 502 : 500).json({
      error: e.message || 'Failed to fetch team',
    });
  }
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

// Auto-sync: run on startup and optionally on a schedule so data goes into the DB automatically.
const autoSync = process.env.AUTO_SYNC !== 'false' && process.env.AUTO_SYNC !== '0';
const syncDelaySec = parseInt(process.env.SYNC_DELAY_SECONDS, 10) || 15;
const syncIntervalHours = parseFloat(process.env.SYNC_INTERVAL_HOURS) || 24;

function scheduleAutoSync() {
  if (!db || !autoSync) return;
  const delayMs = syncDelaySec * 1000;
  console.log(`Auto-sync enabled: first run in ${syncDelaySec}s, then every ${syncIntervalHours}h`);
  setTimeout(() => {
    runSync();
    if (syncIntervalHours > 0) {
      setInterval(runSync, syncIntervalHours * 60 * 60 * 1000);
    }
  }, delayMs);
}

app.listen(PORT, () => {
  console.log(`Basketball Reference API at http://localhost:${PORT}`);
  console.log('  GET  /api/players            list players from DB (limit, offset)');
  console.log('  GET  /api/players/:playerId  one player from DB');
  console.log('  POST /api/players/sync        start full sync (100 at a time)');
  console.log('  GET  /api/players/sync/status');
  console.log('  GET  /api/player/:playerId   live scrape one player');
  console.log('  GET  /api/team/:teamId/:season?');
  scheduleAutoSync();
});
