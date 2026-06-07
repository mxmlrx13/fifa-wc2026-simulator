-- MIGRATION-003: Recovery tokens, host transfer safety, realtime players
-- RUN THIS IN THE SUPABASE SQL EDITOR BEFORE DEPLOYING THE NEW CODE.
-- This migration is NON-DESTRUCTIVE: no data is deleted.

-- 1. Add recovery_token to players (UUID, unique, auto-generated)
ALTER TABLE players ADD COLUMN IF NOT EXISTS recovery_token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS players_recovery_token_key ON players (recovery_token);

-- 2. Enforce single-host invariant at DB level
CREATE UNIQUE INDEX IF NOT EXISTS one_host_per_game ON players (game_id) WHERE is_host;

-- 3. Add players table to realtime publication (for live player-list updates)
ALTER PUBLICATION supabase_realtime ADD TABLE players;
