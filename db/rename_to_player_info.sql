-- Run this once in Railway Postgres → Database → Query to rename your table to player_info.
-- Use the block that matches your current table name.

-- If your table is named "Player info" (with a space):
ALTER TABLE "Player info" RENAME TO player_info;

-- If your table is named "player info" (lowercase with space):
-- ALTER TABLE "player info" RENAME TO player_info;

-- If your table is named players (no space):
-- ALTER TABLE players RENAME TO player_info;

-- After this, the scraper will find the player_info table and sync will work.
