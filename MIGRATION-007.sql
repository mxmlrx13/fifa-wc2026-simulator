/* MIGRATION-007: Opt-in automatic results with dual-source fetch + host review */
/* NON-DESTRUCTIVE — adds column + new table only. Existing games stay manual. */

-- 1. Opt-in flag for automatic results (off by default)
ALTER TABLE games ADD COLUMN IF NOT EXISTS auto_results_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Result suggestions table
CREATE TABLE IF NOT EXISTS result_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  winner_id TEXT,
  source_primary JSONB,
  source_crosscheck JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(game_id, match_id)
);

-- RLS (same permissive pattern as other tables)
ALTER TABLE result_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read result_suggestions" ON result_suggestions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert result_suggestions" ON result_suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update result_suggestions" ON result_suggestions FOR UPDATE USING (true);

-- Realtime for suggestions (so host UI updates live)
ALTER PUBLICATION supabase_realtime ADD TABLE result_suggestions;
