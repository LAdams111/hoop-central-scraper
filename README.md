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

## Postgres (Railway) – store all NBA players

With a Postgres database (e.g. in the same Railway project), the API can store every NBA player (height, weight, stats) and your main site can read from the DB.

### 1. Create the table (once)

In your Railway Postgres (Query tab or `psql`), run the SQL in **`db/schema.sql`** to create the `players` table.

### 2. Set `DATABASE_URL`

In Railway, add a Postgres plugin to your project and connect it to the scraper service. Railway will set `DATABASE_URL` (or `POSTGRES_URL`) automatically when you add the Postgres dependency to the service.

### 3. Sync (automatic or manual)

**Automatic (default):** When the scraper starts and `DATABASE_URL` is set, it will:
- Run a full sync **15 seconds after startup** (so the DB is filled without you doing anything).
- Run sync again **every 24 hours** so new/updated players are picked up.

Optional env vars (e.g. in Railway Variables):
- `AUTO_SYNC=false` – turn off auto-sync (you can still trigger via POST below).
- `SYNC_DELAY_SECONDS=30` – delay before first sync on startup (default 15).
- `SYNC_INTERVAL_HOURS=12` – run sync every 12 hours (default 24). Use `0` to only run once on startup.

**Manual:** You can still trigger a sync anytime:
- **POST** `/api/players/sync` – starts a background job (fetch all player IDs a–z, then 100 players at a time into Postgres).
- **GET** `/api/players/sync/status` – returns `{ running, processed, total, errors, message }`.

### 4. Main website: read from Postgres

Your HoopCentral (or other) frontend should call the scraper API to get data from Postgres:

- **GET** `/api/players?limit=100&offset=0` – list players (paginated). Response: `{ players, total, limit, offset }`. Each player has `player_id`, `name`, `team`, `position`, `height`, `weight`, `summary`, `per_game`, `url`, `updated_at`.
- **GET** `/api/players/:playerId` – one player by Basketball Reference id (e.g. `jamesle01`).

Use your scraper’s base URL (e.g. `https://your-scraper.up.railway.app`) as `baseUrl` when calling these from the main site.

### 5. player_stats table (season-level stats)

The scraper also writes **one row per season** into a `player_stats` table (columns: `player_id`, `season`, `team`, `league`, `games`, `games_started`, `pts_per_g`, `trb_per_g`, `ast_per_g`, `stl_per_g`, `blk_per_g`, `fg_pct`, `fg3_pct`, `ft_pct`). Create this table in Postgres with those column names. If your table name has a space (e.g. "Player stats"), set **`PLAYER_STATS_TABLE=Player stats`** in Railway Variables. If `player_stats` stays empty, check the scraper logs for `player_stats write failed` errors.

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/players` | List players from DB (query: `limit`, `offset`) |
| GET | `/api/players/:playerId` | One player from DB |
| POST | `/api/players/sync` | Start full sync (100 at a time → Postgres) |
| GET | `/api/players/sync/status` | Sync progress |
| GET | `/api/player/:playerId` | Live scrape one player (no DB) |
| GET | `/api/team/:teamId/:season?` | Team info, record, roster + per-game |
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
