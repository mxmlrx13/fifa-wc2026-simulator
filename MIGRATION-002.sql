-- MIGRATION-002: Round-by-round prediction model
-- RUN THIS IN THE SUPABASE SQL EDITOR BEFORE DEPLOYING THE NEW CODE.
-- This is a DESTRUCTIVE migration: it deletes all existing game data.

-- 1. Delete all games (cascades to players, predictions, official_results, scores)
DELETE FROM games;

-- 2. Drop removed columns from games
ALTER TABLE games DROP COLUMN IF EXISTS round_locked;
ALTER TABLE games DROP COLUMN IF EXISTS predictions_locked;
ALTER TABLE games DROP COLUMN IF EXISTS current_round;

-- 3. Add champion_pick to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS champion_pick TEXT NULL;

-- 4. Add predicted_winner_id and actual_winner_id to scores
ALTER TABLE scores ADD COLUMN IF NOT EXISTS predicted_winner_id TEXT NULL;
ALTER TABLE scores ADD COLUMN IF NOT EXISTS actual_winner_id TEXT NULL;

-- 5. Create game_rounds table
CREATE TABLE IF NOT EXISTS game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  opened_at TIMESTAMPTZ NULL,
  locked_at TIMESTAMPTZ NULL,
  scored_at TIMESTAMPTZ NULL,
  UNIQUE(game_id, round_key)
);

-- 6. RLS for game_rounds
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read game_rounds" ON game_rounds FOR SELECT USING (true);
CREATE POLICY "Anyone can insert game_rounds" ON game_rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update game_rounds" ON game_rounds FOR UPDATE USING (true);

-- 7. Realtime for game_rounds
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;
