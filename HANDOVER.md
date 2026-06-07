# FIFA WC 2026 Prediction Game — Handover Document

Last updated: 2026-06-07

---

## 1. Stack and Architecture

### Framework

Next.js 16.2.7 (App Router) with React 19.2.4 and TypeScript 5.x. No pages directory — everything uses the `app/` router.

### Routing

File-system routing via Next.js App Router. Server components by default; pages that need interactivity are marked `'use client'`. API routes live under `app/api/` and run as serverless functions on Netlify.

### State Management

Two parallel state systems:

**Solo mode** — A single React Context (`TournamentContext`) wrapping the entire app via `app/layout.tsx`. Uses `useReducer` with a custom reducer. State shape:

```
{
  groupMatches: GroupMatch[]        // 72 matches, each with optional scores
  knockoutMatches: KnockoutMatch[]  // 32 bracket templates
  knockoutPicks: Record<number, string>  // matchId → winnerId
}
```

Persisted to `localStorage` under key `fifa-wc2026-simulator-state`. Hydrated client-side on mount. Every dispatch triggers `computeTournament()` which re-derives standings, bracket, champion.

**Multiplayer mode** — The predict page (`/play/[code]/predict`) wraps its children in `PredictionProvider`, which creates a second `TournamentContext.Provider`. This shadows the global context. All shared components (GroupCard, KnockoutMatch, etc.) call `useContext(TournamentContext)` and get whichever provider is closest in the tree. Multiplayer predictions are sent to the server via API; they are not persisted to localStorage.

### Styling

Tailwind CSS v4 via `@tailwindcss/postcss`. No component library. Custom CSS properties defined in `app/globals.css`:

```
--color-accent: #a3882a    (gold)
--color-neon-blue: #2563eb
--color-neon-green: #059669
--color-neon-red: #dc2626
```

Custom classes: `.glass-card` (card styling), `.glow-accent` / `.glow-green` / `.glow-blue` (box-shadow glows), `.animate-fadeIn` / `.animate-slideUp` / `.animate-pulse-glow`.

No dark mode. No CSS modules. No styled-components.

### Netlify Config

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

The Next.js plugin converts SSR routes and API routes to Netlify Functions. Static pages are served from CDN. Edge functions handle middleware.

Production URL: `https://fifa-wc2026-predictions.netlify.app`

Environment variables required on Netlify:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. File Tree

```
app/
  layout.tsx                          Root layout. Wraps app in TournamentProvider + Navbar.
  page.tsx                            Landing page. Shows champion if bracket complete, else hero + nav.
  globals.css                         Tailwind theme vars, custom classes, animations.

  groups/
    page.tsx                          All 12 groups rendered as GroupCard list.
    [groupId]/page.tsx                Single group detail (same GroupCard, standalone).

  knockout/page.tsx                   Full bracket view using BracketView component.
  standings/page.tsx                  Qualified teams grid + third-place ranking table.
  summary/page.tsx                    Champion celebration page.

  play/
    page.tsx                          Multiplayer landing. Links to create/join.
    layout.tsx                        Multiplayer layout wrapper (no extra logic currently).
    new/page.tsx                      Renders CreateGameForm.
    join/page.tsx                     Renders JoinGameForm. Reads ?code= from URL.

    [code]/
      page.tsx                        Game dashboard. Player list, leaderboard, action buttons.
      predict/page.tsx                Tabbed prediction interface (Groups/Standings/Knockout).
      results/page.tsx                Host-only. Batch selector + score entry for real results.
      compare/page.tsx                Side-by-side prediction comparison (locked games only).
      leaderboard/page.tsx            Full leaderboard page.
      recover/page.tsx                Recovery page: token validation + session rebind.

  api/games/
    route.ts                          POST: create game. Generates 6-char code.
    [code]/
      route.ts                        GET: game details + players + rounds + current player.
      join/route.ts                   POST: add player to game.
      predictions/route.ts            GET: fetch predictions (round-based visibility). POST: save predictions (round-based validation).
      results/route.ts                POST: enter results + compute scores + auto round transitions + champion bonus.
      round/route.ts                  PATCH: lock_round / unlock_round / transfer_host per prediction round.
      bracket/route.ts                GET: compute actual bracket from official results.
      recover/route.ts                POST: rebind player auth_id via recovery token.
      players/[playerId]/route.ts     DELETE: remove player (host) or leave (self).
      leaderboard/route.ts            GET: aggregated, ranked leaderboard (includes champion bonus).

components/
  layout/Navbar.tsx                   Top nav bar. Links to Groups, Standings, Knockout, Play.

  groups/
    GroupCard.tsx                      One group: matchday tabs, score inputs, standings table.
    GroupStandingsTable.tsx            Table: Pos/Team/P/W/D/L/GF/GA/GD/Pts. Color-coded rows.
    MatchScoreInput.tsx               Single match row: flag + name + ScoreInput + flag + name.

  knockout/
    BracketView.tsx                   Responsive bracket. Horizontal on lg+, vertical on mobile.
    BracketRound.tsx                  One round column in the bracket.
    KnockoutMatch.tsx                 Clickable match card. Tap a team to pick winner.

  standings/
    QualifiedTeamsGrid.tsx            32-team grid grouped by qualification path.
    ThirdPlaceTable.tsx               12 third-place teams ranked with qualified/eliminated status.

  multiplayer/
    CreateGameForm.tsx                Inputs: game name, display name. POST to /api/games.
    JoinGameForm.tsx                  Inputs: 6-char code, display name. POST to /api/games/[code]/join.
    GameCodeDisplay.tsx               Large centered code display with copy button.
    PlayerList.tsx                    Vertical player list. Host badge. Current user highlight.
    RoundControls.tsx                 Per-round status badges. Lock/unlock buttons (host only).
    LeaderboardTable.tsx              Ranked table. Compact (top 5) or full mode. Realtime.
    PredictionComparison.tsx          Match × player table. Scores for groups, winner for knockout.
    PredictionProvider.tsx            Local TournamentContext wrapper for multiplayer predictions.
    RecoveryLinkModal.tsx             Post-create/join modal with copy-able recovery URL.
    RecoveryLinkDisplay.tsx           Collapsible recovery link on dashboard.

  shared/
    TeamBadge.tsx                     Flag emoji + team code/name. Sizes: sm/md/lg.
    ScoreInput.tsx                    Number input 0-99. No browser spinners.
    ResetButton.tsx                   Button with confirmation dialog before executing.

lib/
  constants.ts                        Tournament structure constants (match IDs, code length, etc.)
  types.ts                            All TypeScript interfaces (Team, GroupMatch, KnockoutMatch, etc.)
  utils.ts                            cn() — clsx + tailwind-merge wrapper.
  store.tsx                           TournamentProvider, reducer, context, localStorage persistence.

  data/
    teams.ts                          48 teams. id, name, fifaRanking, confederation, flagCode.
    groups.ts                         12 groups (A-L) with 4 teamIds each.
    fixtures.ts                       72 group matches generated from groups (round-robin).
    bracket-template.ts               32 knockout matches with slot strings.
    third-place-clusters.ts           8 third-place bracket slots with group constraints.

  engine/
    tournament.ts                     Orchestrator: standings → 3rd place → bracket → champion.
    group-standings.ts                Group table calculation from match scores.
    tiebreakers.ts                    FIFA 8-step tiebreaker cascade.
    best-third-place.ts              Rank 12 third-place teams, qualify top 8.
    knockout-bracket.ts              CSP backtracking for 3rd-place assignment. Slot resolution.
    rounds.ts                         Round key ↔ match ID mapping. Labels.
    scoring.ts                        Tiered group scoring. computePoints() function.
    __tests__/                        8 test files, 37 tests total.

  supabase/
    client.ts                         Browser-side Supabase client (anon key).
    server.ts                         Server-side Supabase client + service role client.
    auth.ts                           ensureAnonymousSession() — creates anon session if none.
    use-game.ts                       React hook: fetch game data, subscribe to realtime changes.
    game-fetch.ts                     Fetch wrapper with 401 retry (ensureAnonymousSession).
    hydrate-predictions.ts            Convert DB prediction rows → TournamentState for PredictionProvider.

supabase-schema.sql                   Full schema: tables, constraints, RLS policies, migration notes.
netlify.toml                          Netlify build config.
vitest.config.ts                      Test runner config (jsdom environment).
package.json                          Dependencies and scripts.
```

Orphaned files in the repo root (not part of the app): `proxy.ts`, `deno.lock`, `.plan/`.

---

## 3. Supabase Schema

### Tables

#### games

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | UUID | PK | gen_random_uuid() |
| code | TEXT | UNIQUE, NOT NULL | — |
| name | TEXT | NOT NULL | — |
| created_at | TIMESTAMPTZ | | now() |

Simplified table — round state is tracked in `game_rounds`.

#### game_rounds

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | UUID | PK | gen_random_uuid() |
| game_id | UUID | FK → games(id) ON DELETE CASCADE | — |
| round_key | TEXT | NOT NULL | — |
| status | TEXT | NOT NULL | 'pending' |
| opened_at | TIMESTAMPTZ | NULLABLE | — |
| locked_at | TIMESTAMPTZ | NULLABLE | — |
| scored_at | TIMESTAMPTZ | NULLABLE | — |
| | | UNIQUE(game_id, round_key) | |

`round_key` is one of: `group`, `r32`, `r16`, `qf`, `sf`, `final`.
`status` transitions: `pending` → `open` → `locked` → `scored`.

When a game is created, 6 rows are seeded: `group` starts as `open`, the rest as `pending`. When all results for a round are entered, the round auto-transitions to `scored` and the next round opens.

#### players

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | UUID | PK | gen_random_uuid() |
| auth_id | UUID | NOT NULL | — |
| game_id | UUID | FK → games(id) ON DELETE CASCADE | — |
| display_name | TEXT | NOT NULL | — |
| is_host | BOOLEAN | | false |
| champion_pick | TEXT | NULLABLE | — |
| created_at | TIMESTAMPTZ | | now() |
| | | UNIQUE(game_id, display_name) | |

`champion_pick` stores the player's predicted tournament winner (team ID). Can only be set while the `group` round is open.

#### predictions

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | UUID | PK | gen_random_uuid() |
| player_id | UUID | FK → players(id) ON DELETE CASCADE | — |
| game_id | UUID | FK → games(id) ON DELETE CASCADE | — |
| match_id | INTEGER | NOT NULL | — |
| round | TEXT | NULLABLE | — |
| home_score | INTEGER | NULLABLE | — |
| away_score | INTEGER | NULLABLE | — |
| winner_id | TEXT | NULLABLE | — |
| submitted_at | TIMESTAMPTZ | | now() |
| | | UNIQUE(player_id, game_id, match_id) | |

Group predictions use `home_score` + `away_score`. Knockout predictions use `winner_id`. The `round` column is populated by the API based on match ID but is not strictly required.

#### official_results

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | UUID | PK | gen_random_uuid() |
| game_id | UUID | FK → games(id) ON DELETE CASCADE | — |
| match_id | INTEGER | NOT NULL | — |
| home_score | INTEGER | NOT NULL | — |
| away_score | INTEGER | NOT NULL | — |
| winner_id | TEXT | NULLABLE | — |
| entered_at | TIMESTAMPTZ | | now() |
| | | UNIQUE(game_id, match_id) | |

`winner_id` is used for knockout matches that go to penalties (tied score, need explicit winner).

#### scores

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | UUID | PK | gen_random_uuid() |
| player_id | UUID | FK → players(id) ON DELETE CASCADE | — |
| game_id | UUID | FK → games(id) ON DELETE CASCADE | — |
| match_id | INTEGER | NOT NULL | — |
| points | INTEGER | NOT NULL | 0 |
| prediction_home | INTEGER | NULLABLE | — |
| prediction_away | INTEGER | NULLABLE | — |
| actual_home | INTEGER | NULLABLE | — |
| actual_away | INTEGER | NULLABLE | — |
| predicted_winner_id | TEXT | NULLABLE | — |
| actual_winner_id | TEXT | NULLABLE | — |
| | | UNIQUE(player_id, game_id, match_id) | |

`match_id = 0` is a sentinel for the champion bonus row (10 points if the player correctly predicted the tournament winner).

### Relationships

```
games 1──* game_rounds (game_id FK, CASCADE delete)
games 1──* players     (game_id FK, CASCADE delete)
games 1──* predictions (game_id FK, CASCADE delete)
games 1──* official_results (game_id FK, CASCADE delete)
games 1──* scores      (game_id FK, CASCADE delete)
players 1──* predictions (player_id FK, CASCADE delete)
players 1──* scores      (player_id FK, CASCADE delete)
```

### RLS Policies

All tables have RLS enabled. All current policies are fully permissive:

```sql
-- Every table has these three policies (or two for read-only tables):
CREATE POLICY "Anyone can read ..." ON <table> FOR SELECT USING (true);
CREATE POLICY "Anyone can insert ..." ON <table> FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update ..." ON <table> FOR UPDATE USING (true);
```

Access control is enforced in the API routes (checking `is_host`, round status, `auth_id`), not at the database level. This means a user with the anon key could bypass the API and write directly to Supabase. See section 7 for details.

### Realtime

Enabled on `games`, `scores`, and `game_rounds` tables:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE scores;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;
```

---

## 4. Scoring Logic

### Group Matches (match IDs 1–72)

Implemented in `lib/engine/scoring.ts`, function `computePoints(predictedHome, predictedAway, actualHome, actualAway)`.

Determines the "result" of each score pair using `Math.sign(home - away)`:
- `+1` = home win
- `0` = draw
- `-1` = away win

Four tiers:

| Tier | Condition | Points | Example |
|------|-----------|--------|---------|
| Exact | `pH === aH && pA === aA` | 5 | Predict 2-1, actual 2-1 |
| Result + GD | Result matches AND `(pH - pA) === (aH - aA)` | 3 | Predict 3-1, actual 2-0 |
| Result only | Result matches, GD differs | 1 | Predict 1-0, actual 3-1 |
| Wrong | Result doesn't match | 0 | Predict 1-0, actual 0-2 |

The function returns `{ points: number, reason: 'exact' | 'result_gd' | 'result' | 'wrong' }`.

Edge case: if `predictedHome` or `predictedAway` is null, the player gets 0 points. The results API handles this by checking for null before calling `computePoints()`.

### Knockout Matches (match IDs 73–104)

Escalating points per round, defined in `lib/constants.ts`:

| Round | Match IDs | Points per correct winner |
|-------|-----------|--------------------------|
| Round of 32 | 73–88 | 3 |
| Round of 16 | 89–96 | 4 |
| Quarter-finals | 97–100 | 5 |
| Semi-finals | 101–102 | 6 |
| Third-place match | 103 | 6 |
| Final | 104 | 8 |

Implemented via `getKnockoutPointsForMatch(matchId)` which checks `MATCH_POINT_OVERRIDES` first, then falls back to `KNOCKOUT_POINTS[round]`.

No partial credit. No bonus for predicting the correct score of a knockout match (scores aren't predicted for knockout matches — only the winner).

**Knockout draw validation:** The results API rejects (400) any knockout batch submission where a match has `homeScore === awayScore` and no `winnerId`. The response includes `{ error: "...", matchIds: [73, 75] }` listing the offending match IDs.

### Champion Bonus

10 points for correctly predicting the tournament winner. The champion pick is stored in `players.champion_pick` and can be set while the `group` round is open. When match 104 (the final) result is entered, the system awards the bonus by inserting a score row with `match_id = 0` (sentinel `CHAMPION_BONUS_MATCH_ID`).

### Leaderboard Aggregation

In `app/api/games/[code]/leaderboard/route.ts`:

1. Query all scores for the game (including `match_id = 0` champion bonus rows)
2. Group by player_id
3. Sum `points` for `totalPoints`
4. For `match_id = 0`: track as `championBonus` (not counted in exactScores/correctResults)
5. For other matches: count rows where `points === 5` for `exactScores`, `points > 0` for `correctResults`
6. Sort by: `totalPoints` desc → `exactScores` desc → `correctResults` desc
7. Assign shared ranks: players tied on all three criteria get the same rank number (e.g., 1, 2, 2, 4 — rank 3 is skipped)
8. Each entry includes `rank` and `championBonus` fields

### Theoretical Maximums

- 72 group matches × 5 pts = 360
- R32: 16 × 3 = 48, R16: 8 × 4 = 32, QF: 4 × 5 = 20, SF: 2 × 6 = 12, 3rd: 6, Final: 8 → 126
- Champion bonus: 10
- Total maximum: 496

---

## 5. Auth and Group/Session Model

### Authentication

Anonymous Supabase sessions. No email, no password, no OAuth.

`lib/supabase/auth.ts` calls `supabase.auth.getUser()`. If no session exists, calls `supabase.auth.signInAnonymously()`. The returned `user.id` (a UUID) is stored as `auth_id` in the `players` table.

Sessions are browser-specific. Players can recover access from a different device/browser using their recovery link (see below).

### 401 Resilience

`lib/supabase/game-fetch.ts` provides a `gameFetch()` wrapper used by the `useGame` hook. On a 401 response, it calls `ensureAnonymousSession()` once and retries the request. This handles the common case where a session expired silently. The `useGame` hook uses this wrapper for its API calls.

### Recovery Links

Each player row has a `recovery_token` (UUID, unique, auto-generated). After creating or joining a game, a modal shows the recovery URL:

```
/play/[code]/recover?token=<recovery_token>
```

The player saves this link. The dashboard also shows a collapsible "Your Recovery Link" section.

**Recovery flow** (POST `/api/games/[code]/recover`):
1. Caller provides `{ token }` in request body
2. Server validates the token belongs to a player in this game
3. Updates that player's `auth_id` to the caller's current anonymous session ID
4. The old session (if it still exists somewhere) simply no longer maps to any player

This allows recovering on a new device, new browser, or after clearing cookies.

### Creating a Game

POST `/api/games` with `{ name, displayName }`.

1. Server calls `supabase.auth.getUser()` to get the caller's anonymous user ID
2. Generates a 6-character random uppercase alphanumeric code (retries up to 5 times if collision)
3. Inserts a row in `games`
4. Inserts a row in `players` with `is_host: true` and the caller's `auth_id`
5. Seeds 6 `game_rounds` rows
6. Returns `{ code, gameId, recoveryToken }`

### Joining a Game

POST `/api/games/[code]/join` with `{ displayName }`.

1. Looks up the game by code (case-insensitive: `.eq('code', code.toUpperCase())`)
2. Gets caller's `auth_id`
3. Checks if the player is already in the game (same `auth_id` + `game_id`)
4. Inserts a row in `players` with `is_host: false`
5. Display name must be unique within the game (enforced by DB unique constraint on `game_id, display_name`)
6. Returns `{ playerId, recoveryToken }`

### Host Permissions and Transfer

The `is_host` flag on the `players` table determines host status. Exactly one player per game is the host, enforced by a partial unique index: `CREATE UNIQUE INDEX one_host_per_game ON players (game_id) WHERE is_host`.

Host-only actions (enforced in API routes by querying `is_host`):
- Lock/unlock prediction rounds (PATCH `/api/games/[code]/round` with `action: 'lock_round'` or `'unlock_round'`)
- Enter official results (POST `/api/games/[code]/results`)
- Transfer host status (PATCH `/api/games/[code]/round` with `action: 'transfer_host'`, `playerId`)
- Remove other players (DELETE `/api/games/[code]/players/[playerId]`)

**Host transfer:** The current host sends `{ action: 'transfer_host', playerId: '<target>' }`. The API sets `is_host = false` on the current host and `is_host = true` on the target, with rollback if the second update fails. The `one_host_per_game` index ensures the invariant holds even under concurrent calls. The dashboard shows a star icon per player row (host only) to trigger transfer with a confirmation dialog.

### Player Removal

DELETE `/api/games/[code]/players/[playerId]` — allowed when:
- Caller is the host removing someone else (not self)
- Caller is the player themselves (leaving the game)

The host cannot remove/leave themselves — they must transfer host first (returns 400 with a message). Cascading FKs clean up predictions and scores automatically. The dashboard shows a remove icon per player (host), and a "Leave" button for non-host self.

### Group Size

No enforced limit. The `players` table has no cap on rows per `game_id`. The UI and API will work with any number of players, though the leaderboard and comparison table will become unwieldy beyond ~20 players.

### Realtime Player Updates

The `players` table is in the Supabase realtime publication. The `useGame` hook subscribes to INSERT/UPDATE/DELETE events on `players` (filtered by `game_id`), so the player list updates live when someone joins, leaves, or host transfers.

---

## 6. Result-Entry Flow

### Step-by-step

1. Host navigates to `/play/[code]/results`
2. Page loads: verifies the current user is the host. Non-hosts see an error message.
3. Host selects a batch from a row of buttons:

| Batch Key | Label | Match IDs | Count |
|-----------|-------|-----------|-------|
| group_md1 | Matchday 1 | 1–24 | 24 |
| group_md2 | Matchday 2 | 25–48 | 24 |
| group_md3 | Matchday 3 | 49–72 | 24 |
| r32 | Round of 32 | 73–88 | 16 |
| r16 | Round of 16 | 89–96 | 8 |
| qf | Quarter-Finals | 97–100 | 4 |
| sf | Semi-Finals | 101–102 | 2 |
| final | Final | 103–104 | 2 |

4. Page renders one row per match in the batch. Each row shows:
   - Match number (e.g., "M1")
   - Home team flag + code (or slot label like "Winner M73" for unresolved knockout matches)
   - Two ScoreInput fields
   - Away team flag + code
5. For knockout batches: if home and away scores are equal (penalty scenario), a winner picker appears below the match row with buttons for each team
6. Host fills in scores and clicks "Submit N Results"

### Server-side processing (POST `/api/games/[code]/results`)

1. Verify caller is host
2. Read `results` array and `batch` from request body
3. Validate `batch` is a known round key — if invalid, return 400 with error message
4. **Round status check**: verify the prediction round for this batch is `locked` or `scored` — otherwise return 400
5. Get valid match IDs for the batch via `getMatchIdsForRound(batch)`
6. Filter results to only include match IDs in the valid set
7. Determine if batch is knockout (`!batch.startsWith('group_md')`)
8. For knockout batches: check for tied matches without `winnerId` — if any, return 400 with the list of offending match IDs
9. For knockout results with explicit winner: use `winnerId`; for decisive scores: infer winner from score
10. Upsert into `official_results` table (on conflict: `game_id, match_id`)
11. Fetch all predictions from `predictions` table for the batch's match IDs
12. For each prediction:
    - **Group match**: call `computePoints(predicted, actual)` → 0/1/3/5 points
    - **Knockout match**: compare `prediction.winner_id` to `result.winner_id` → escalating points (3/4/5/6/8) via `getKnockoutPointsForMatch(matchId)`, or 0 if wrong
    - If prediction has null scores (player didn't fill in), → 0 points
    - Score rows include `predicted_winner_id` and `actual_winner_id` for knockout matches
13. Upsert into `scores` table (on conflict: `player_id, game_id, match_id`)
14. **Champion bonus**: if match 104 (final) was in this batch, look up all players' `champion_pick` and award 10 points (or 0) via a `match_id = 0` score row
15. **Automatic round transition**: if all matches in the prediction round now have results, mark the round as `scored` and open the next `pending` round
16. Return `{ resultsEntered: N, scoresComputed: M, championBonusAwarded: K }`

### What triggers leaderboard updates

The `LeaderboardTable` component subscribes to Supabase Realtime INSERT events on the `scores` table. When step 10 above inserts/updates rows, all connected clients' leaderboards re-fetch automatically.

### Re-entering results

Results can be re-submitted. The upsert on `official_results` and `scores` overwrites previous values. Scores are recomputed from scratch. This allows the host to correct mistakes.

---

## 7. Known Bugs, TODOs, and Fragile Code

### Bugs

**Session expiry is partially handled.** The `gameFetch()` wrapper retries on 401 after calling `ensureAnonymousSession()`. This recovers from expired sessions for data fetches. However, if the new session doesn't map to any player (e.g., the browser was wiped), the user needs their recovery link to rebind their player identity.

### Fragile Code

**Code generation race condition.** Two simultaneous game creation requests could generate the same 6-character code. The check-then-insert pattern is not atomic. With 36^6 = ~2.2 billion possible codes, the probability is negligible, but the code only retries `CODE_GENERATION_RETRIES` (5) times and doesn't catch the unique constraint violation.

**RLS policies are fully open.** All tables allow all operations for all users. A user who knows the Supabase URL and anon key (both are in client-side code) can directly insert/update/delete any row in any table. They could modify other players' predictions, change round statuses, or insert fake scores. Access control exists only at the API route level.

**Hydrate-predictions doesn't validate match IDs.** The `hydratePredictions()` function accepts any array of prediction rows and maps them onto the tournament state. Out-of-bounds match IDs (e.g., 105, -1) are silently dropped for group matches but could populate invalid entries in `knockoutPicks`.

### Fixed in this pass (previously listed as bugs/fragile)

**Knockout draw-without-winner** — The results API now returns 400 with the list of offending match IDs when a knockout match is tied and no `winnerId` is provided. The results page disables the submit button and shows an inline red prompt on each offending row.

**Leaderboard tiebreakers** — Sort now uses three criteria (total points → exact scores → correct results) with shared rank assignment (e.g., 1, 2, 2, 4). The `rank` field is returned in the API response and rendered in the UI.

**Magic numbers** — All tournament structure constants (`GROUP_MATCH_MAX_ID`, `TOTAL_MATCHES`, `GAME_CODE_LENGTH`, `CODE_GENERATION_RETRIES`, `QUALIFIED_THIRD_PLACE_COUNT`, `THIRD_PLACE_MATCH_ID`, `FINAL_MATCH_ID`) are now in `lib/constants.ts` and referenced everywhere.

**Batch validation** — The results API now validates the batch key against `getAllRounds()` and returns 400 with a descriptive error if invalid.

**Non-null assertion in join route** — Replaced `player!.id` with an explicit null check that returns 500 with an error message.

**Silent error swallowing** — All `catch {}` blocks in `store.tsx`, `server.ts`, and `use-game.ts` now call `console.error()`. The `use-game.ts` hook includes the error message in the visible error state instead of a generic string.

**Third-place match labeling** — The results page now shows distinct labels ("Third-place match" / "Final") above matches 103 and 104.

### Hacky / Non-obvious

**Context shadowing pattern.** The multiplayer predict page works by rendering a `PredictionProvider` that creates a new `TournamentContext.Provider`, shadowing the global one from `layout.tsx`. This means the same components work in both solo and multiplayer mode without changes. It's clever but non-obvious — someone editing `GroupCard` won't immediately know it can receive state from two different providers.

**Round transition timing.** When all results for a prediction round are entered, the round auto-transitions to `scored` and the next round opens. This happens in the results POST handler. If the host enters results across multiple requests for the same batch, the transition only fires when the final result completes the round. The transition uses `eq('status', 'pending')` to avoid accidentally reopening a round that was already open/locked.

---

## 8. What Is NOT Implemented

### Features

- **No real-time auto-save for predictions.** Players must manually click save. If they close the tab, unsaved work is lost.
- **No match schedule or deadlines.** No dates, times, or automatic locking based on kick-off.
- **No notifications.** Players aren't notified when predictions are locked, results are entered, or the leaderboard changes.
- **No game deletion.** Games persist indefinitely. No cleanup mechanism.
- **No password/private games.** Any player with the code can join. No approval flow.
- **No prediction summary/receipt.** After saving, there's no page showing "here's what you predicted."
- **No score breakdown view.** The leaderboard shows total points but there's no per-match breakdown showing which predictions scored how many points.
- **No mobile-optimized bracket.** The bracket renders on mobile but is cramped on small screens.
- **No dark mode.**
- **No internationalization.** English only. No i18n framework.
- **No social sharing.** No share buttons, OG tags for link previews, or shareable result images.
- **No admin panel.** Game management requires direct Supabase dashboard access.
- **No export/import.** No way to export predictions or results as CSV/PDF.
- **No fair play tiebreaker.** The FIFA tiebreaker cascade skips step 7 (disciplinary record).

### Security

- **No rate limiting** on any endpoint.
- **No CAPTCHA** or bot protection.
- **No input sanitization** beyond type checking. Display names, game names are inserted as-is.
- **No CSRF protection** beyond what Next.js provides by default.
- **Proper RLS policies** that check `auth.uid()` against `players.auth_id`.

### Infrastructure

- **No CI/CD.** Deployments are manual (`npx netlify-cli deploy --prod`).
- **No error monitoring** (Sentry, LogRocket, etc.).
- **No analytics.**
- **No database backups** beyond Supabase's default plan.
- **No staging environment.** One Supabase project, one Netlify site.

---

## Constraints to Know

**Primary device:** Desktop-first design. Works on mobile but the bracket view and comparison table are tight on small screens. Score inputs are usable on phone but entering 72+ scores on mobile is tedious.

**Language:** English only. Team names are in English. No i18n.

**Expected group size:** Designed for 2–20 players. No hard limit, but the comparison table (players as columns) breaks layout beyond ~10 players on desktop. Leaderboard scales fine.

**Prediction model:** Round-by-round. Group predictions are entered upfront (group round starts as `open`). Once the host locks the group round and results are entered, the system auto-transitions to the next round. Knockout rounds are predicted on the real bracket (derived from actual results). Each round follows: `pending` → `open` (players predict) → `locked` (host locks) → `scored` (all results entered, auto-transition opens next round). Champion pick is set during the group round.
