-- Multiplayer Prediction Game — Supabase Schema
-- Run this in Supabase SQL Editor to create all required tables.

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  current_round TEXT NOT NULL DEFAULT 'group_md1',
  round_locked BOOLEAN DEFAULT FALSE,
  predictions_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  is_host BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game_id, display_name)
);

CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL,
  round TEXT,
  home_score INTEGER,
  away_score INTEGER,
  winner_id TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, game_id, match_id)
);

CREATE TABLE official_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  winner_id TEXT,
  entered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game_id, match_id)
);

CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  prediction_home INTEGER,
  prediction_away INTEGER,
  actual_home INTEGER,
  actual_away INTEGER,
  UNIQUE(player_id, game_id, match_id)
);

-- Enable Realtime on relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE scores;

-- Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Games: anyone can read, anyone can insert
CREATE POLICY "Anyone can read games" ON games FOR SELECT USING (true);
CREATE POLICY "Anyone can create games" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update games" ON games FOR UPDATE USING (true);

-- Players: anyone can read, authenticated can insert
CREATE POLICY "Anyone can read players" ON players FOR SELECT USING (true);
CREATE POLICY "Anyone can insert players" ON players FOR INSERT WITH CHECK (true);

-- Predictions: players can manage their own
CREATE POLICY "Anyone can read predictions" ON predictions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert predictions" ON predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update predictions" ON predictions FOR UPDATE USING (true);

-- Official results: anyone can read, host inserts (enforced at API level)
CREATE POLICY "Anyone can read results" ON official_results FOR SELECT USING (true);
CREATE POLICY "Anyone can insert results" ON official_results FOR INSERT WITH CHECK (true);

-- Scores: anyone can read, system inserts
CREATE POLICY "Anyone can read scores" ON scores FOR SELECT USING (true);
CREATE POLICY "Anyone can insert scores" ON scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update scores" ON scores FOR UPDATE USING (true);

-- =============================================================================
-- Migration for existing databases (run these ALTER statements separately):
-- =============================================================================
-- ALTER TABLE games ADD COLUMN predictions_locked BOOLEAN DEFAULT FALSE;
-- ALTER TABLE predictions ADD COLUMN winner_id TEXT;
-- ALTER TABLE predictions ALTER COLUMN round DROP NOT NULL;
-- ALTER TABLE official_results ADD COLUMN winner_id TEXT;
