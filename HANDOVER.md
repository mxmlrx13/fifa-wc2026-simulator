# FIFA WC 2026 Prediction Game — Handover Document

Last updated: 2026-06-07 | **v1.0.2** — score-based knockout predictions with shootout-winner calls

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

Tailwind CSS v4 via `@tailwindcss/postcss`. No component library. Custom CSS properties defined in `app/globals.css` using the Tricolore Editorial design system (see section 14).

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
  globals.css                         Tailwind v4 theme: Tricolore Editorial tokens, animations.

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
      page.tsx                        Phase-aware dashboard (predicting/live/finished).
      predict/page.tsx                Tabbed prediction interface (Groups/Standings/Knockout).
      results/page.tsx                Host-only. Batch selector + score entry for real results.
      compare/page.tsx                Side-by-side prediction comparison (locked/scored rounds only).
      leaderboard/page.tsx            Full leaderboard page with you-row highlighting.
      breakdown/page.tsx              Per-player score breakdown with round cards and PointsChips.
      recover/page.tsx                Recovery page: token validation + session rebind.

  api/games/
    route.ts                          POST: create game. Generates 6-char code.
    [code]/
      route.ts                        GET: game details + players + rounds + current player.
      join/route.ts                   POST: add player to game.
      predictions/route.ts            GET: fetch predictions (round-based visibility, completion counts). POST: save predictions.
      results/route.ts                GET: load existing results for a batch. POST: enter results + compute scores + auto round transitions + champion bonus.
      results/status/route.ts         GET: per-batch completion counts (entered/total).
      round/route.ts                  PATCH: lock_round / unlock_round / open_round / transfer_host.
      bracket/route.ts                GET: compute actual bracket from official results.
      recover/route.ts                POST: rebind player auth_id via recovery token.
      scores/route.ts                 GET: per-match scores + predictions + results for breakdown view. Supports ?playerId= for viewing other players.
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

  onboarding/
    OnboardingFlow.tsx                5-step full-screen onboarding. Two modes: 'join' (first visit) and 'back' (re-entry).

  multiplayer/
    CreateGameForm.tsx                Inputs: game name, display name. POST to /api/games.
    JoinGameForm.tsx                  Inputs: 6-char code, display name. POST to /api/games/[code]/join.
    GameCodeDisplay.tsx               Large centered code display with copy button.
    PlayerList.tsx                    Player list with Modal confirms for remove/transfer/leave. Completion counts (n/72).
    RoundControls.tsx                 Per-round status badges. Lock/unlock buttons (host only).
    LeaderboardTable.tsx              Ranked table. Compact (top 3 + you) or full mode. You-row highlighting. Realtime.
    PredictionComparison.tsx          Match × player table. Frozen first column. Scores for groups, winner for knockout.
    PredictionProvider.tsx            Local TournamentContext wrapper for multiplayer predictions.
    ChampionPicker.tsx                48-team grid for champion pick. One selectable, red highlight.
    RecoveryLinkModal.tsx             Post-create/join modal with copy-able recovery URL.
    RecoveryLinkDisplay.tsx           Collapsible recovery link on dashboard.

  shared/
    TeamBadge.tsx                     Flag emoji + team code/name. Sizes: sm/md/lg.
    ScoreInput.tsx                    Number input 0-99. No browser spinners.
    ResetButton.tsx                   Button with confirmation dialog before executing.

  ui/
    Button.tsx                        Primary/secondary/destructive button variants.
    Badge.tsx                         Status badge (open/locked/scored/live). Pill-shaped.
    Card.tsx                          Standard card wrapper with border + bg.
    EmptyState.tsx                    Icon + label + message for empty lists.
    Modal.tsx                         Centered overlay with title, content, confirm/cancel. slideUp animation.
    PointsChip.tsx                    Tier-colored score chip (exact/gd/result/zero/pending).
    SavePill.tsx                      Fixed save indicator for prediction pages.
    Skeleton.tsx                      Loading skeleton (card/row variants).

lib/
  constants.ts                        Tournament structure constants, prediction round mappings, knockout scoring.
  types.ts                            All TypeScript interfaces (Team, GroupMatch, KnockoutMatch, etc.)
  utils.ts                            cn() — clsx + tailwind-merge wrapper.
  store.tsx                           TournamentProvider, reducer, context, localStorage persistence.

  data/
    teams.ts                          48 teams. id, name, fifaRanking, confederation, flagCode.
    groups.ts                         12 groups (A-L) with 4 teamIds each.
    fixtures.ts                       72 group matches generated from groups (round-robin).
    bracket-template.ts               32 knockout matches with slot strings.
    third-place-clusters.ts           8 third-place bracket slots with group constraints.
    schedule.ts                       Official FIFA WC2026 match schedule (104 entries). Deadline derivation functions.

  engine/
    tournament.ts                     Orchestrator: standings → 3rd place → bracket → champion.
    group-standings.ts                Group table calculation from match scores.
    tiebreakers.ts                    FIFA 8-step tiebreaker cascade.
    best-third-place.ts              Rank 12 third-place teams, qualify top 8. Criteria: pts→GD→GF→FIFA ranking (team conduct skipped).
    knockout-bracket.ts              CSP backtracking for 3rd-place assignment. Slot resolution. applyR32Overrides() for host corrections.
    rounds.ts                         RoundKey (result batches) ↔ match ID mapping. Labels.
    scoring.ts                        Tiered group scoring. computePoints() function.
    host-actions.ts                   getHostNextAction() — pure function for host's single next action.
    quick-fill.ts                     Ranking-based score generation for quick-fill. Deterministic PRNG.
    consensus.ts                      Champion votes, group winner consensus, boldest picks, pick splits.
    leaderboard.ts                    computeLeaderboard(), computeMovement(), getPreviousBatch(). Shared-rank logic.
    __tests__/                        Test files (243+ tests total).

  supabase/
    client.ts                         Browser-side Supabase client (anon key).
    server.ts                         Server-side Supabase client + service role client.
    auth.ts                           ensureAnonymousSession() — creates anon session if none.
    use-game.ts                       React hook: fetch game data, subscribe to realtime changes.
    game-fetch.ts                     Fetch wrapper with 401 retry (ensureAnonymousSession).
    hydrate-predictions.ts            Convert DB prediction rows → TournamentState for PredictionProvider.

  hooks/
    use-auto-save.ts                  Auto-save debounce hook for prediction pages.
    use-game-registry.ts              localStorage registry (wc26-my-games) for My Games hub. useSyncExternalStore.
    use-onboarding.ts                 Onboarding flag (wc26-onboarded): isOnboarded(), markOnboarded(), clearOnboarded().

supabase-schema.sql                   Full schema: tables, constraints, RLS policies, migration notes.
netlify.toml                          Netlify build config.
vitest.config.ts                      Test runner config (jsdom environment).
package.json                          Dependencies and scripts.
QA_CHECKLIST.md                       Manual QA test script (~20 min, two browsers + phone).
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
| recovery_token | UUID | UNIQUE | gen_random_uuid() |
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

#### leaderboard_snapshots

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | UUID | PK | gen_random_uuid() |
| game_id | UUID | FK → games(id) ON DELETE CASCADE | — |
| batch | TEXT | NOT NULL | — |
| player_id | UUID | FK → players(id) ON DELETE CASCADE | — |
| rank | INTEGER | NOT NULL | — |
| points | INTEGER | NOT NULL | 0 |
| created_at | TIMESTAMPTZ | | now() |
| | | UNIQUE(game_id, batch, player_id) | |

Written after each result batch is scored. `batch` is a `RoundKey` string (`group_md1`, `group_md2`, etc.). Used by `computeMovement()` to show rank change arrows on the leaderboard.

### Relationships

```
games 1──* game_rounds (game_id FK, CASCADE delete)
games 1──* players     (game_id FK, CASCADE delete)
games 1──* predictions (game_id FK, CASCADE delete)
games 1──* official_results (game_id FK, CASCADE delete)
games 1──* scores      (game_id FK, CASCADE delete)
games 1──* leaderboard_snapshots (game_id FK, CASCADE delete)
players 1──* predictions (player_id FK, CASCADE delete)
players 1──* scores      (player_id FK, CASCADE delete)
players 1──* leaderboard_snapshots (player_id FK, CASCADE delete)
```

### RLS Policies

All tables have RLS enabled. All current policies are fully permissive:

```sql
CREATE POLICY "Anyone can read ..." ON <table> FOR SELECT USING (true);
CREATE POLICY "Anyone can insert ..." ON <table> FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update ..." ON <table> FOR UPDATE USING (true);
```

Access control is enforced in the API routes (checking `is_host`, round status, `auth_id`), not at the database level.

### Realtime

Enabled on `games`, `scores`, `game_rounds`, and `players` tables:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE scores;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
```

---

## 4. Scoring Logic

### Group Matches (match IDs 1–72)

Implemented in `lib/engine/scoring.ts`, function `computePoints(predictedHome, predictedAway, actualHome, actualAway)`.

| Tier | Condition | Points |
|------|-----------|--------|
| Exact | `pH === aH && pA === aA` | 5 |
| Result + GD | Result matches AND `(pH - pA) === (aH - aA)` | 3 |
| Result only | Result matches, GD differs | 1 |
| Wrong | Result doesn't match | 0 |

Returns `{ points: number, reason: 'exact' | 'result_gd' | 'result' | 'wrong' }`.

### Knockout Matches (match IDs 73–104)

Players predict a full scoreline (homeScore + awayScore) plus a winner. If scores are tied, a shootout-winner pick is required. Scoring uses escalating base points per round plus an exact-score bonus:

| Round | Match IDs | Base (correct winner) | Exact bonus | Max |
|-------|-----------|----------------------|-------------|-----|
| Round of 32 | 73–88 | 3 | +2 | 5 |
| Round of 16 | 89–96 | 4 | +2 | 6 |
| Quarter-finals | 97–100 | 5 | +2 | 7 |
| Semi-finals | 101–102 | 6 | +2 | 8 |
| Third-place match | 103 | 6 | +2 | 8 |
| Final | 104 | 8 | +2 | 10 |

Base points via `getKnockoutPointsForMatch(matchId)`, bonus via `KNOCKOUT_EXACT_BONUS` (2). Wrong winner = 0 regardless of score.

**Worked examples:**
- Predicted 2-1 (BRA), actual 3-0 (BRA) → correct winner → 3 pts (R32)
- Predicted 2-1 (BRA), actual 2-1 (BRA) → correct + exact → 3+2 = 5 pts (R32)
- Predicted 1-1 (BRA shootout), actual 1-1 (BRA shootout) → correct + exact → 3+2 = 5 pts
- Predicted 1-1 (BRA shootout), actual 1-1 (ARG shootout) → wrong winner → 0 pts
- Predicted 2-0 (BRA), actual 0-1 (ARG) → wrong winner → 0 pts

### Champion Bonus

10 points for correctly predicting the tournament winner. Stored in `players.champion_pick`. Awarded when match 104 result is entered via `match_id = 0` score row.

### Leaderboard Aggregation

1. Sum `points` for `totalPoints` (including champion bonus)
2. Count exact scores (5-pt predictions) and correct results (any points > 0)
3. Sort by: `totalPoints` desc → `exactScores` desc → `correctResults` desc
4. Assign shared ranks (e.g., 1, 2, 2, 4)

### Theoretical Maximum: 496

- 72 group × 5 = 360
- R32: 16 × 3 = 48, R16: 8 × 4 = 32, QF: 4 × 5 = 20, SF: 2 × 6 = 12, 3rd: 6, Final: 8 → 126
- Champion bonus: 10

---

## 5. Auth and Session Model

### Authentication

Anonymous Supabase sessions. No email, no password, no OAuth.

`lib/supabase/auth.ts` calls `supabase.auth.getUser()`. If no session exists, calls `supabase.auth.signInAnonymously()`. The returned `user.id` is stored as `auth_id` in `players`.

### 401 Resilience

`lib/supabase/game-fetch.ts` wraps fetch with automatic retry: on 401, calls `ensureAnonymousSession()` then retries once.

### Recovery Links

Each player has a `recovery_token` (UUID). Recovery URL: `/play/[code]/recover?token=<token>`. POST to `/api/games/[code]/recover` updates `auth_id` to the caller's session.

### Creating a Game

POST `/api/games` with `{ name, displayName }`. Generates 6-char code, seeds 6 `game_rounds` rows, returns `{ code, gameId, recoveryToken }`.

### Joining a Game

POST `/api/games/[code]/join` with `{ displayName }`. Display name must be unique within the game.

### Host Permissions and Transfer

`is_host` flag determines host status. Partial unique index ensures exactly one host per game.

Host-only actions:
- Lock/unlock/open prediction rounds
- Enter official results
- Transfer host status
- Remove other players

Host transfer: PATCH `/api/games/[code]/round` with `{ action: 'transfer_host', playerId }`. The `one_host_per_game` index ensures the invariant.

### Player Removal

DELETE `/api/games/[code]/players/[playerId]`. Host cannot leave without transferring first (returns 400). Cascading FKs clean up predictions and scores.

### R32 Third-Place Assignment & Host Override

The CSP solver in `knockout-bracket.ts` assigns qualified third-place teams to R32 slots via deterministic backtracking (stable iteration order: slots processed in `thirdPlaceSlots` array order, teams tried in ranking order). Slot constraints in `third-place-clusters.ts` are verified against the official FIFA 2026 bracket (ESPN/FIFA source).

**Caveat:** FIFA publishes 495 preset scenarios (Annex C). When multiple valid CSP assignments exist, our solver's first-found solution may differ from FIFA's official announcement. For player predictions this is harmless. For the real bracket (from official results), the host can correct mismatches using:

- **API:** `PATCH /api/games/[code]/bracket-overrides` with `{ overrides: { "matchId": "teamId" } }` — host-only, only before R32 is locked.
- **Storage:** `games.r32_overrides` JSONB column (MIGRATION-006).
- **Application:** `GET /api/games/[code]/bracket` applies overrides after CSP resolution via `applyR32Overrides()`.

---

## 6. Result-Entry Flow

### Step-by-step

1. Host navigates to `/play/[code]/results`
2. Selects a batch from pills (batch pills show per-batch completion state):

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

3. Existing results for the batch are loaded and pre-populated in inputs
4. For knockout ties: winner picker appears (two team buttons)
5. Host clicks "Submit N Results"

### Server-side processing (POST `/api/games/[code]/results`)

1. Verify caller is host
2. Validate `batch` key and round status (must be `locked` or `scored`)
3. Reject knockout draws without `winnerId` (400)
4. Upsert `official_results`
5. Compute scores for all players: group matches use `computePoints()`, knockout matches compare `winner_id` for base points (3/4/5/6/6/8) + exact scoreline bonus (+2 via `KNOCKOUT_EXACT_BONUS`). Example: R32 correct winner = 3 pts; R32 correct winner + exact score = 5 pts; wrong winner = 0 pts regardless of score
6. Upsert `scores`
7. Champion bonus: if final result entered, award `match_id = 0` rows
8. Auto-transition: if all matches in prediction round have results, mark `scored` and open next `pending` round
9. Return `{ resultsEntered, scoresComputed, championBonusAwarded }`

### Re-entering results

Results can be re-submitted. Upsert overwrites previous values and recomputes scores.

---

## 7. Dashboard Phases

The game dashboard (`/play/[code]`) renders one of three layouts based on round state:

### Phase derivation

```typescript
function derivePhase(rounds): 'predicting' | 'live' | 'finished' {
  if (rounds.length === 0) return 'predicting'
  if (rounds.every(r => r.status === 'scored')) return 'finished'
  if (rounds.some(r => r.status === 'locked' || r.status === 'scored')) return 'live'
  return 'predicting'
}
```

### Predicting

- Hero card: game code (Fraunces, large), tap-to-copy, share hint
- Primary CTA: "Enter Predictions"
- Player list with completion counts (n/72)
- Round timeline (Group = open, rest = pending)
- Host: destructive lock button with modal confirm

### Live

- Compact leaderboard: top 3 + current user (if outside top 3), "+ n more" link
- Contextual primary CTA: host → enter results / lock next round / open next round; player → enter picks for open round or "View my predictions"
- Round timeline with status colors
- Links row: Breakdown · Compare · Full Leaderboard

### Finished

- Celebration card: "Tournament Complete" + game name (Fraunces 28px)
- Full leaderboard with final standings
- Links: Breakdown · Compare

### Host Action Priority

`getHostNextAction(rounds)` is a pure function in `lib/engine/host-actions.ts` that returns exactly one action:
1. Lock an open round
2. Enter results for a locked round
3. Open the next pending round (if predecessor is scored)
4. Finished (all rounds scored)

### Onboarding Flow

A 5-step full-screen onboarding sequence (`components/onboarding/OnboardingFlow.tsx`) shown to first-time visitors.

**Triggers:**
- First visit to `/play/[code]` when not a player and `localStorage('wc26-onboarded')` is not set → shows onboarding, then redirects to join form
- First visit to `/play/join?code=...` when not onboarded → shows onboarding before join form
- "How it works" link on `/play` hub and in-game dashboard → shows onboarding in "back" mode (no flag change)

**Behavior:**
- 5 screens with progress dots, Skip jumps to last step, fadeIn 250ms (respects prefers-reduced-motion)
- Screen 2 pill shows live countdown when deadline enforcement is enabled
- `mode='join'`: final CTA "Join the game →" sets flag + continues to join form
- `mode='back'`: final CTA "Back" returns to previous screen, no flag change
- Never auto-shows twice (flag check), never auto-shows to existing players

**Flag:** `localStorage` key `wc26-onboarded` = `'1'`. Managed by `lib/hooks/use-onboarding.ts`.

---

## 8. Two Round-Key Systems

There are two overlapping round-key systems:

### Prediction Rounds (`PredictionRoundKey`)

Defined in `lib/constants.ts`. These track the lifecycle of player predictions:

```
'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'
```

Used in `game_rounds` table, round transitions, prediction visibility.

### Result Batches (`RoundKey`)

Defined in `lib/engine/rounds.ts`. These are the batches for entering official results:

```
'group_md1' | 'group_md2' | 'group_md3' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'
```

The group prediction round maps to three result batches (MD1/MD2/MD3). Knockout rounds are 1:1.

`getPredictionRoundForMatchId()` maps match IDs → prediction round. `getRoundForMatchId()` maps match IDs → result batch.

---

## 9. Known Issues and Fragile Code

### Bugs

**Session expiry is partially handled.** `gameFetch()` retries on 401, but if the new session doesn't map to any player, the user needs their recovery link.

### Fragile Code

**Code generation race condition.** Two simultaneous game creation requests could generate the same code. The probability is negligible (36^6 ≈ 2.2B codes) but the code doesn't catch the unique constraint violation.

**RLS policies are fully open.** All tables allow all operations for all users. A user with the anon key could bypass API routes and modify any data directly.

**Hydrate-predictions doesn't validate match IDs.** Out-of-bounds match IDs could populate invalid entries in `knockoutPicks`.

### React Compiler lint warnings

The React compiler flags `setState` calls at the top of `useEffect` bodies in several files (breakdown, results, LeaderboardTable, PredictionComparison, MatchScoreInput, store.tsx). These are the standard data-fetching pattern and work correctly at runtime. The compiler's strict mode prefers `startTransition` but this is a low-priority refactor.

### Hacky / Non-obvious

**Context shadowing pattern.** `PredictionProvider` shadows `TournamentContext` from `layout.tsx`. Components work in both solo and multiplayer mode without changes, but someone editing `GroupCard` won't immediately know it can receive state from two different providers.

**Round transition timing.** Auto-transitions happen in the results POST handler when the final result for a round is entered. The transition uses `eq('status', 'pending')` to avoid reopening already-open/locked rounds.

---

## 10. What Is NOT Implemented

### Features

- **No real-time auto-save for predictions.** Players must manually save.
- **No notifications.** No alerts for lock/results/leaderboard changes.
- **No game deletion.** Games persist indefinitely.
- **No password/private games.** Any player with the code can join.
- **No prediction receipt.** No summary page after saving.
- **No dark mode.**
- **No internationalization.** English only.
- **No admin panel.** Requires Supabase dashboard.
- **No export/import.** No CSV/PDF export.

### Security

- **No rate limiting** on any endpoint.
- **No input sanitization** beyond type checking.
- **Proper RLS policies** that check `auth.uid()` are not yet implemented.

### Infrastructure

- **No CI/CD.** Manual deployments.
- **No error monitoring** (Sentry, etc.).
- **No analytics.**
- **No staging environment.**

---

## 11. Constraints to Know

**Primary device:** Desktop-first design, works on mobile. Score inputs on phone are usable but entering 72+ scores is tedious.

**Expected group size:** 2–20 players. Comparison table breaks layout beyond ~10 columns on desktop.

**Prediction model:** Round-by-round. Group predictions are entered upfront. After host locks and results are entered, system auto-transitions to next round. Knockout rounds use the real bracket from official results. Champion pick is set during the group round.

---

## 12. Testing

### Test structure

17 test files in `lib/engine/__tests__/`, 243+ tests covering:

- `scoring.test.ts` — Group match scoring tiers (5/3/1/0), knockout scoring with exact bonus
- `leaderboard.test.ts` — Tiebreaker ordering, shared ranks, multi-batch snapshot progression, movement matrix
- `results-validation.test.ts` — Batch validation, knockout draw detection
- `player-management.test.ts` — Removal permissions, host transfer, recovery tokens
- `host-actions.test.ts` — Host action priority chain (14 tests)
- `rounds.test.ts` — Round key mapping, match ID ranges
- `tiebreakers.test.ts` — FIFA 8-step tiebreaker cascade
- `best-third-place.test.ts` — Third-place ranking and qualification
- `knockout-bracket.test.ts` — CSP backtracking for bracket assignment
- `group-standings.test.ts` — Group table calculation
- `full-tournament-simulation.test.ts` — End-to-end simulation with 4 players, 104 matches, naive-vs-production scoring. Snapshot rows per batch, cumulative monotonicity, movement direction
- `api-integration.test.ts` — API-level validation logic: prediction round gating, lock transitions, result entry, auto-transitions, champion bonus
- `ui-smoke.test.ts` — Static analysis: no bare "Loading...", no deprecated fields, no old design classes, no hardcoded hex colors
- `schedule.test.ts` — Schedule integrity, deadline derivation, chronological order, rejection timing, backstop auto-lock
- `quick-fill.test.ts` — Ranking-based score generation, bounds, no-overwrite, determinism, immutability/purity
- `onboarding.test.ts` — Onboarding flag logic, trigger conditions, skip-always-present, re-entry mode
- `consensus.test.ts` — Champion votes, group winner consensus, boldest picks, pick splits, edge cases

### Running tests

```bash
npm test          # vitest run
npm run build     # Next.js production build
npm run lint      # ESLint with React compiler
```

### Manual QA

See `QA_CHECKLIST.md` for a 20-minute manual test script covering the full tournament flow.

---

## 13. API Reference

### Game lifecycle

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/games` | POST | Create game |
| `/api/games/[code]` | GET | Game details + players + rounds |
| `/api/games/[code]/join` | POST | Join game |
| `/api/games/[code]/recover` | POST | Recover access via token |

### Predictions

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/games/[code]/predictions` | POST | Save predictions |
| `/api/games/[code]/predictions` | GET | Fetch predictions (visibility-filtered). `?round=` filter, `?completion=true` for counts |

### Results & Scoring

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/games/[code]/results` | POST | Enter results + compute scores |
| `/api/games/[code]/results` | GET | Load existing results for a batch (`?batch=`) |
| `/api/games/[code]/results/status` | GET | Per-batch completion counts |
| `/api/games/[code]/scores` | GET | Per-match breakdown. `?playerId=` for other players |
| `/api/games/[code]/leaderboard` | GET | Aggregated ranked leaderboard |

### Game management

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/games/[code]/round` | PATCH | `lock_round`, `unlock_round`, `open_round`, `transfer_host` |
| `/api/games/[code]/players/[id]` | DELETE | Remove player or leave game |
| `/api/games/[code]/bracket` | GET | Computed bracket from official results |

---

## 14. Design System — Tricolore Editorial

### Overview

The design system is called "Tricolore Editorial." Warm, paper-like backgrounds with editorial typography. Structure comes from borders and type hierarchy, not shadows or glows. Defined in `app/globals.css` and `design-refs/DESIGN_SPEC.md`.

### Color Tokens

```css
/* Surfaces */
--color-paper: #faf8f4;     /* Page background */
--color-card: #ffffff;       /* Card background */
--color-line: #e9e4da;       /* All borders, 1px */
--color-input: #fcfbf8;      /* Input fields */

/* Ink */
--color-ink: #19233f;        /* Primary text (navy) */
--color-muted: #8a8f9e;      /* Secondary text */

/* Accents */
--color-navy: #19233f;       /* Primary buttons, active states */
--color-red: #c1273a;        /* Scarce: current user, exact scores, destructive actions */
--color-red-soft: #fdf3f2;   /* YOU row bg, selected states */

/* Qualification */
--color-win-soft/ink          /* Group winner (green) */
--color-runner-soft/ink       /* Runner-up (blue) */
--color-third-soft/ink        /* Third place (amber) */
--color-out-soft/ink          /* Eliminated (gray) */

/* Points tier chips */
--color-tier-exact-*          /* 5pts: solid red/white */
--color-tier-gd-*             /* 3pts: green-soft */
--color-tier-result-*         /* 1pt: blue-soft */
--color-tier-zero-*           /* 0pts: sand/muted */
```

### Typography

| Role | Font | Size/Weight |
|------|------|-------------|
| Page title | Fraunces 700 | 24px |
| Card title | Fraunces 700 | 17px |
| Section label | Inter 700 | 10px UPPERCASE +0.09em |
| Body | Inter 400/500 | 13.5px |
| Scores/points | Inter 800 tabular | 14–15px |

### Primitives (`components/ui/`)

- **Button** — Primary (navy), secondary (outlined), destructive (red border/text)
- **Badge** — Pill-shaped status (open=green, locked=gray, scored=green ✓, live=red)
- **Modal** — Centered overlay, slideUp animation, confirm/cancel actions
- **PointsChip** — Score display: exact=red, gd=green, result=blue, zero=sand, pending=muted
- **EmptyState** — Centered icon + label + message
- **Skeleton** — Loading placeholder (card/row variants)
- **SavePill** — Fixed position save indicator

### Design Rules

1. **Red is scarce** — Only for: current user (YOU tag), exact-score chips, selected knockout picks, destructive actions. If a screen shows more than ~2 red elements, something is wrong.
2. **One primary action per screen** — At most one navy button per screen.
3. **France-neutral** — No team preselected, promoted, or styled differently. Flags appear only as data.
4. **No gradients, glassmorphism, glows, or dark mode.**
5. **Animations** — Only `fadeIn` (180ms) and `slideUp` (200ms). Respects `prefers-reduced-motion`.

### Radii

```css
--radius-card: 14px;
--radius-button: 12px;
--radius-input: 9px;
--radius-pill: 999px;
```

### Shell Structure

**Mobile:** Bottom tab bar concept (per spec §4, not yet fully implemented as a separate component — navigation is via links on the dashboard).

**Desktop:** Top in-game header with back link, game name + code, nav links. Content max-width varies by page (1080px for main, tighter for forms).

---

## 15. Operational Tooling

### CI (GitHub Actions)

`.github/workflows/ci.yml` runs on every push/PR to `main`:
1. `npm run test` — Vitest unit tests
2. `npm run lint -- --max-warnings=0 --ignore-pattern '.netlify/**'` — ESLint strict
3. `npm run build` — Next.js production build (with placeholder Supabase env vars)

Netlify handles deploys separately (auto-deploy on push to `main`). CI only gates quality.

### Error Monitoring (Sentry)

`@sentry/nextjs` v10.56.0 integrated via:
- `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` — init files
- `instrumentation.ts` + `instrumentation-client.ts` — Next.js instrumentation hooks
- `app/global-error.tsx` — error boundary that reports to Sentry
- `next.config.ts` — wrapped with `withSentryConfig` (sourcemaps disabled, silent mode)

**Graceful degradation:** All init files guard behind `if (dsn)`. App runs fine without `SENTRY_DSN` set.

**Env vars:** `SENTRY_DSN` (server) and `NEXT_PUBLIC_SENTRY_DSN` (client) — same value, set in Netlify env and `.env.local`.

### Demo Seed Script

```bash
npm run seed:demo    # scripts/seed-demo.mjs
```

Creates a demo game (code `DEMOxx`) with 4 players (Alice/Bob/Carol/Dave), full group predictions, champion picks, locked group round, MD1 official results, computed scores, and a leaderboard snapshot. Requires `SUPABASE_DB_URL` in `.env.local`.

### Backup Script

```bash
npm run backup       # scripts/backup.mjs
```

Dumps all 7 tables to `backups/<ISO-timestamp>/` as JSON files. Restore order (FK-safe): games, players, game_rounds, predictions, official_results, scores, leaderboard_snapshots. The `backups/` directory is gitignored.

### Pre-Release Audit Scripts

- `scripts/check-schema.mjs` — queries information_schema to verify table/column existence
- `scripts/api-lifecycle-test.mjs` — 24-assertion DB-level integration test covering the full game lifecycle (create, join, predict, lock, score, knockout, champion bonus, movement, concurrency, recovery, cascade delete)

### Migrations Applied

| Migration | Description |
|-----------|-------------|
| MIGRATION-002 | Added game_rounds, leaderboard_snapshots tables |
| MIGRATION-003 | Added champion_pick to players, predicted/actual_winner_id to scores |
| MIGRATION-004 | Added recovery_token to players |
| MIGRATION-005 | Added winner_id to predictions and official_results |
| MIGRATION-006 | Added r32_overrides (JSONB) to games for host R32 third-place corrections |
