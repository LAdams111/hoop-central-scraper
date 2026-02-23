-- Add birth_date, hometown, jersey_number, age to player_info.
-- Run once on existing DB (e.g. Railway Postgres).

ALTER TABLE player_info
  ADD COLUMN IF NOT EXISTS jersey_number TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS hometown TEXT;
