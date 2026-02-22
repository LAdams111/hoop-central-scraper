# Basketball Reference Scraper & API

A small **Node.js API** that scrapes player and team stats from [Basketball Reference](https://www.basketball-reference.com), plus a **JavaScript client** you can use on your website.

## Why a backend?

Basketball Reference blocks direct requests from the browser (CORS). So the scraper runs on your server and your site calls your own API.

## Quick start

### 1. Install and run the API

```bash
cd "Scraper Cursor"
npm install
npm start
```

API runs at **http://localhost:3001**.

### 2. Use from your JavaScript website

**Option A – Same origin**  
If your site is served from the same host (e.g. you proxy `/api` to this server), use relative URLs:

```javascript
import { getPlayerStats, getTeamStats } from './client/basketball-reference-client.js';

const player = await getPlayerStats('jamesle01');
console.log(player.name, player.summary, player.perGame);

const team = await getTeamStats('LAL', 2025);
console.log(team.name, team.record, team.roster);
```

**Option B – Different origin**  
If your frontend is on another port or domain, pass the API base URL and enable CORS (already enabled in `server.js`):

```javascript
const player = await getPlayerStats('jamesle01', { baseUrl: 'http://localhost:3001' });
const team = await getTeamStats('LAL', 2025, { baseUrl: 'http://localhost:3001' });
```

Copy `client/basketball-reference-client.js` into your project, or serve it and import from there.

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/player/:playerId` | Player info + summary + per-game stats. Example: `/api/player/jamesle01` |
| GET | `/api/team/:teamId/:season?` | Team info, record, roster + per-game. Example: `/api/team/LAL/2025` |
| GET | `/api/health` | Health check |

- **playerId**: Basketball Reference id (e.g. `jamesle01`, `curryst01`). Find it in the player’s URL.
- **teamId**: 3-letter abbreviation (e.g. `LAL`, `BOS`).
- **season**: Year the season ends (e.g. `2025` = 2024–25). Omit for current season.

## Response shapes

**Player** (`/api/player/:playerId`):

- `playerId`, `name`, `team`, `position`, `height`, `weight`
- `summary` – current/career stats (G, PTS, TRB, AST, FG%, etc.)
- `perGame` – array of season rows (season, team_id, g, pts_per_g, trb_per_g, ast_per_g, etc.)
- `url` – Basketball Reference page

**Team** (`/api/team/:teamId/:season`):

- `teamId`, `season`, `name`, `record` (wins/losses)
- `ptsPerGame`, `oppPtsPerGame`, `srs`, `pace`, `offRtg`, `defRtg`
- `roster` – array of players with `player`, `playerId`, `pos`, `g`, `pts`, `trb`, `ast`, etc.
- `url` – Basketball Reference page

## Deploying the API

Run the server on your host (Node 18+) and point your frontend’s `baseUrl` to it. You can also run it behind a reverse proxy (e.g. Nginx) or deploy to a Node-friendly host (Railway, Render, Fly.io, etc.) and use that URL in `baseUrl`.

## Respectful use

- The server sends a clear User-Agent.
- Don’t hammer the site; add a simple rate limit or cache if you expect heavy traffic.
- Consider Basketball Reference’s [terms of use](https://www.sports-reference.com/terms-of-use/) for production use.
