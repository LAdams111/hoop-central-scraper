-- Run this in Railway Postgres (Query tab) if player_stats inserts fail
-- because "id" rejects NULL. This makes id auto-generated like "Player info".
-- The scraper does NOT send "id" in INSERTs, so Postgres must generate it.

-- Option 1: If id exists but has no default (integer, not null, no default):
CREATE SEQUENCE IF NOT EXISTS player_stats_id_seq;
ALTER TABLE player_stats ALTER COLUMN id SET DEFAULT nextval('player_stats_id_seq');
ALTER SEQUENCE player_stats_id_seq OWNED BY player_stats.id;
SELECT setval('player_stats_id_seq', COALESCE((SELECT MAX(id) FROM player_stats), 1));

-- Option 2: If the table has no id column yet, add it as SERIAL:
-- ALTER TABLE player_stats ADD COLUMN id SERIAL PRIMARY KEY;

-- Option 3: If id is the wrong type or you prefer a clean SERIAL column:
-- ALTER TABLE player_stats DROP COLUMN IF EXISTS id;
-- ALTER TABLE player_stats ADD COLUMN id SERIAL PRIMARY KEY;
