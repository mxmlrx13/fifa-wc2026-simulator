/* MIGRATION-004: Leaderboard snapshots for movement tracking */
/* NON-DESTRUCTIVE — no data is deleted. */

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  batch TEXT NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game_id, batch, player_id)
);

ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read leaderboard_snapshots" ON leaderboard_snapshots FOR SELECT USING (true);
  CREATE POLICY "Anyone can insert leaderboard_snapshots" ON leaderboard_snapshots FOR INSERT WITH CHECK (true);
  CREATE POLICY "Anyone can update leaderboard_snapshots" ON leaderboard_snapshots FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
