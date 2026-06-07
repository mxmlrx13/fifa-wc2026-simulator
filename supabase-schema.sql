-- Multiplayer Prediction Game — Supabase Schema (canonical)
-- Run this in Supabase SQL Editor to create all required tables from scratch.

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_key TEXT NOT NULL,        -- 'group','r32','r16','qf','sf','final'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'open' | 'locked' | 'scored'
  opened_at TIMESTAMPTZ NULL,
  locked_at TIMESTAMPTZ NULL,
  scored_at TIMESTAMPTZ NULL,
  UNIQUE(game_id, round_key)
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  is_host BOOLEAN DEFAULT FALSE,
  champion_pick TEXT NULL,
  recovery_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game_id, display_name)
);

-- Enforce exactly one host per game at DB level
CREATE UNIQUE INDEX one_host_per_game ON players (game_id) WHERE is_host;

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
  predicted_winner_id TEXT,
  actual_winner_id TEXT,
  UNIQUE(player_id, game_id, match_id)
);

CREATE TABLE leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  batch TEXT NOT NULL,              -- result batch key (group_md1 … final)
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game_id, batch, player_id)
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE scores;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read games" ON games FOR SELECT USING (true);
CREATE POLICY "Anyone can create games" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update games" ON games FOR UPDATE USING (true);

CREATE POLICY "Anyone can read game_rounds" ON game_rounds FOR SELECT USING (true);
CREATE POLICY "Anyone can insert game_rounds" ON game_rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update game_rounds" ON game_rounds FOR UPDATE USING (true);

CREATE POLICY "Anyone can read players" ON players FOR SELECT USING (true);
CREATE POLICY "Anyone can insert players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update players" ON players FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete players" ON players FOR DELETE USING (true);

CREATE POLICY "Anyone can read predictions" ON predictions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert predictions" ON predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update predictions" ON predictions FOR UPDATE USING (true);

CREATE POLICY "Anyone can read results" ON official_results FOR SELECT USING (true);
CREATE POLICY "Anyone can insert results" ON official_results FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read scores" ON scores FOR SELECT USING (true);
CREATE POLICY "Anyone can insert scores" ON scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update scores" ON scores FOR UPDATE USING (true);

CREATE POLICY "Anyone can read leaderboard_snapshots" ON leaderboard_snapshots FOR SELECT USING (true);
CREATE POLICY "Anyone can insert leaderboard_snapshots" ON leaderboard_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update leaderboard_snapshots" ON leaderboard_snapshots FOR UPDATE USING (true);
