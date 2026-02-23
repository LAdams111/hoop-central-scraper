-- Migration: Fix player_stats.id so it auto-generates (stops "null value in column id" on INSERT).
-- Run this once in Railway Postgres → Database → Query.
-- Table name: use "Player stats" (with quotes) if your table has a space in the name.

-- Step 1: Drop the existing id column (any existing data in id is lost; other columns unchanged)
ALTER TABLE player_stats DROP COLUMN IF EXISTS id;

-- Step 2: Add id back as auto-generated primary key (pick one)

-- Option A: SERIAL PRIMARY KEY (classic, same as player_info)
ALTER TABLE player_stats ADD COLUMN id SERIAL PRIMARY KEY;

-- Option B (alternative): IDENTITY primary key (PostgreSQL 10+, SQL standard)
-- ALTER TABLE player_stats ADD COLUMN id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY;

-- After this, INSERTs that omit id will get an auto-generated id and inserts will succeed.

-- ---------------------------------------------------------------------------
-- If your table is named "Player stats" (with a space), run this instead:
-- ---------------------------------------------------------------------------
-- ALTER TABLE "Player stats" DROP COLUMN IF EXISTS id;
-- ALTER TABLE "Player stats" ADD COLUMN id SERIAL PRIMARY KEY;
