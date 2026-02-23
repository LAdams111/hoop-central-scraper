-- Run this once on your Railway Postgres to create the player_info table.
-- You can run it via Railway CLI or in the Postgres query tab.

CREATE TABLE IF NOT EXISTS player_info (
  id SERIAL PRIMARY KEY,
  player_id TEXT NOT NULL UNIQUE,
  name TEXT,
  team TEXT,
  position TEXT,
  height TEXT,
  weight TEXT,
  jersey_number TEXT,
  birth_date DATE,
  age INTEGER,
  hometown TEXT,
  summary JSONB DEFAULT '{}',
  raw_data JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_player_info_player_id ON player_info(player_id);
CREATE INDEX IF NOT EXISTS idx_player_info_name ON player_info(name);
CREATE INDEX IF NOT EXISTS idx_player_info_team ON player_info(team);
