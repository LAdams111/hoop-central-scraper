import express from 'express';
import cors from 'cors';
import { parsePlayerPage } from './scraper/player.js';
import { parseTeamPage } from './scraper/team.js';

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

// GET /api/player/:playerId
// playerId = Basketball Reference id, e.g. jamesle01
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
// teamId = e.g. LAL, BOS. season = e.g. 2025 (for 2024-25). Defaults to current.
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

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Basketball Reference API at http://localhost:${PORT}`);
  console.log('  GET /api/player/:playerId   e.g. /api/player/jamesle01');
  console.log('  GET /api/team/:teamId/:season?  e.g. /api/team/LAL/2025');
});
