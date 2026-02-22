-- Run this once on your Railway Postgres to create the players table.
-- You can run it via Railway CLI or in the Postgres query tab.

CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  player_id TEXT NOT NULL UNIQUE,
  name TEXT,
  team TEXT,
  position TEXT,
  height TEXT,
  weight TEXT,
  summary JSONB DEFAULT '{}',
  per_game JSONB DEFAULT '[]',
  url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_player_id ON players(player_id);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team);
CREATE INDEX IF NOT EXISTS idx_players_updated_at ON players(updated_at);
