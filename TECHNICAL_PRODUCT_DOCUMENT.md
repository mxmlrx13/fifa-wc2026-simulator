# FIFA World Cup 2026 Prediction Game — Technical Product Document

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Experience & Flow](#2-user-experience--flow)
3. [Architecture Overview](#3-architecture-overview)
4. [Directory Structure](#4-directory-structure)
5. [Tech Stack & Dependencies](#5-tech-stack--dependencies)
6. [Data Model & Static Data](#6-data-model--static-data)
7. [Tournament Engine](#7-tournament-engine)
8. [State Management](#8-state-management)
9. [Database Schema & Supabase Integration](#9-database-schema--supabase-integration)
10. [API Routes](#10-api-routes)
11. [Frontend Components](#11-frontend-components)
12. [Scoring System](#12-scoring-system)
13. [Multiplayer Flow (End-to-End)](#13-multiplayer-flow-end-to-end)
14. [Styling & Design System](#14-styling--design-system)
15. [Testing](#15-testing)
16. [Deployment & Infrastructure](#16-deployment--infrastructure)
17. [Current Limitations & Known Gaps](#17-current-limitations--known-gaps)
18. [Glossary](#18-glossary)

---

## 1. Product Overview

### What It Is

A web app that lets groups of friends predict the entire FIFA World Cup 2026 tournament — every group match score and every knockout round winner — then compete on a shared leaderboard as real results come in.

### The Problem It Solves

World Cup prediction games are typically spreadsheet-based, manually scored, and tedious to manage. This app automates the entire process: tournament simulation, bracket population, score computation, and real-time leaderboard updates.

### Core Value Propositions

1. **Full tournament simulation** — The app models the real FIFA World Cup 2026 format: 48 teams, 12 groups of 4, best third-place qualification, and a 32-team knockout bracket. Players interact with a live simulation that computes standings, resolves tiebreakers, determines which third-place teams qualify, and populates the bracket — all in real time as they enter scores.

2. **Multiplayer prediction game** — Players create or join games via a 6-character code. Everyone predicts all 104 matches in a single session. The host locks predictions, then enters real results in batches as the tournament progresses. Points are computed automatically and the leaderboard updates in real time.

3. **Solo sandbox mode** — Even without multiplayer, the app functions as a standalone World Cup simulator. Users can enter hypothetical scores, see how standings change, explore tiebreaker scenarios, and play through the full bracket.

### Target Users

- Friend groups, office pools, family competitions
- Football fans who want to explore "what if" tournament scenarios
- Anyone who wants a clean, modern prediction game without spreadsheets

---

## 2. User Experience & Flow

### 2.1 Solo Mode (Simulator)

The solo mode is accessible from the home page without authentication.

**Flow:**
1. User lands on `/` — sees the app title, a brief description, and navigation to Groups, Standings, Knockout, and Summary pages
2. `/groups` — All 12 groups displayed as cards. Each card shows 6 matches (3 matchdays). User enters scores for each match. Standings table updates live below each group card. A progress bar shows how many matches are filled in.
3. `/standings` — Once all group matches are filled, shows the 32 qualified teams: 12 group winners, 12 runners-up, and the 8 best third-place teams. Includes a ranked third-place table showing which teams qualified and which were eliminated.
4. `/knockout` — A visual bracket from Round of 32 through the Final. Teams are auto-populated based on group results and third-place assignments. User clicks on a team name to pick the winner of each match. Bracket cascades: picking a R32 winner populates R16, etc.
5. `/summary` — Shows the champion and a celebration view when the bracket is fully resolved.

**Key UX Details:**
- All state persists in localStorage — refreshing the page doesn't lose progress
- Changing a group score that affects qualification automatically clears affected knockout picks (prevents orphaned winners)
- Each group card has a reset button with a confirmation dialog
- Score inputs are compact number fields (0-99) with custom styling (no browser spinners)
- The bracket is horizontal on desktop (left-to-right flow) and vertical on mobile (stacked rounds)

### 2.2 Multiplayer Mode

**Setup Phase:**
1. Host visits `/play/new` — enters a game name and their display name — gets a 6-character code
2. Host shares code with friends (code is displayed prominently with a copy button)
3. Friends visit `/play/join` — enter the code and their display name — join the game
4. Everyone sees the game dashboard at `/play/[code]` — player list, leaderboard, action buttons

**Prediction Phase:**
1. While predictions are open, each player clicks "Enter Predictions" on the dashboard
2. `/play/[code]/predict` — A tabbed interface: Groups | Standings | Knockout
   - **Groups tab**: Same GroupCard components as solo mode, but scoped to a local prediction state (not the global solo state)
   - **Standings tab**: Shows computed standings and qualified teams based on the player's group predictions
   - **Knockout tab**: Shows the bracket populated from the player's group predictions. Player picks winners for each knockout match.
3. A sticky "Save All Predictions" button at the bottom sends all 104 match predictions to the server in one request
4. Players can revisit and re-save as many times as they want while predictions are open

**Lock & Results Phase:**
1. Host clicks "Lock All Predictions" on the dashboard — no more changes allowed
2. All players can now view each other's predictions via `/play/[code]/compare` (tabbed by round)
3. As real matches are played, host visits `/play/[code]/results`
   - Selects a batch (MD1, MD2, MD3, R32, R16, QF, SF, Final)
   - Enters real scores for those matches
   - For knockout matches that end in a draw (penalties), a winner picker appears
   - Submits — the server computes points for all players automatically
4. Leaderboard at `/play/[code]/leaderboard` updates in real time via Supabase Realtime subscriptions

**Key UX Details:**
- No account creation required — anonymous Supabase sessions are created automatically
- Predictions are hidden from other players until the host locks them
- The dashboard shows a compact leaderboard inline, with a link to the full version
- Host-only controls are conditionally rendered (non-hosts never see lock/results buttons)
- The prediction interface reuses the exact same GroupCard, BracketView, and KnockoutMatch components from solo mode, wrapped in a local `PredictionProvider` that shadows the global `TournamentContext`

---

## 3. Architecture Overview

### High-Level Architecture

```
Browser (React 19 / Next.js 16)
    |
    |— Solo Mode: TournamentProvider (Context + localStorage)
    |— Multiplayer: PredictionProvider (local Context) → API Routes → Supabase
    |
    |— Shared Components: GroupCard, BracketView, KnockoutMatch, etc.
    |— Shared Engine: group-standings, tiebreakers, best-third-place, knockout-bracket
    |
Next.js API Routes (Server-side)
    |
    |— Supabase JS Client (anon key for reads, service role for writes)
    |
Supabase (PostgreSQL + Auth + Realtime)
    |
    |— Tables: games, players, predictions, official_results, scores
    |— Anonymous Auth (no email/password required)
    |— Realtime subscriptions (games table updates, scores table inserts)
```

### Key Architectural Decisions

1. **Pure engine functions** — All tournament logic (standings, tiebreakers, bracket resolution) lives in pure functions under `lib/engine/`. These functions take data in, return data out, with zero side effects. This makes them testable, reusable in both solo and multiplayer contexts, and easy to reason about.

2. **Context shadowing for multiplayer** — The solo mode uses a global `TournamentProvider` in `app/layout.tsx`. The multiplayer predict page wraps its children in a local `PredictionProvider` that creates its own `TournamentContext`. All child components (GroupCard, KnockoutMatch, etc.) call `useContext(TournamentContext)` and automatically get the local state — no prop drilling, no conditional logic in components.

3. **Server-side scoring** — When the host enters results, the server computes all players' scores in the same request. This prevents client-side score manipulation and ensures consistency. The scoring algorithm is also a pure function (`computePoints`).

4. **Anonymous auth** — Players don't need to create accounts. Supabase anonymous sessions are created automatically. The `auth_id` links a browser session to a player record. This minimizes friction but means players can't recover their session from a different device.

5. **Batch-based results** — Rather than entering results match-by-match, the host selects a batch (e.g., "Group Matchday 1" = matches 1-24) and enters all results for that batch at once. This maps to how the real tournament progresses.

---

## 4. Directory Structure

```
/Users/maximeleroux/Desktop/maxime/projects/fifa-wc2026-simulator/
|
|-- app/                              # Next.js App Router pages & API routes
|   |-- layout.tsx                    # Root layout: TournamentProvider, Navbar, global styles
|   |-- page.tsx                      # Home/landing page
|   |-- globals.css                   # Tailwind theme, custom properties, animations
|   |
|   |-- groups/
|   |   |-- page.tsx                  # All 12 groups with score inputs
|   |   |-- [groupId]/page.tsx        # Single group detail view
|   |
|   |-- knockout/page.tsx             # Full knockout bracket
|   |-- standings/page.tsx            # Qualified teams + third-place rankings
|   |-- summary/page.tsx              # Champion celebration
|   |
|   |-- play/                         # Multiplayer section
|   |   |-- page.tsx                  # Multiplayer landing (create/join)
|   |   |-- layout.tsx                # Multiplayer layout wrapper
|   |   |-- new/page.tsx              # Create game form
|   |   |-- join/page.tsx             # Join game form
|   |   |-- [code]/
|   |       |-- page.tsx              # Game dashboard
|   |       |-- predict/page.tsx      # Prediction interface (tabbed)
|   |       |-- results/page.tsx      # Host results entry
|   |       |-- compare/page.tsx      # Compare predictions across players
|   |       |-- leaderboard/page.tsx  # Full leaderboard
|   |
|   |-- api/games/
|       |-- route.ts                  # POST: create game
|       |-- [code]/
|           |-- route.ts              # GET: game details + players
|           |-- join/route.ts         # POST: join game
|           |-- predictions/route.ts  # GET/POST: predictions
|           |-- results/route.ts      # POST: enter results + compute scores
|           |-- round/route.ts        # PATCH: lock predictions
|           |-- leaderboard/route.ts  # GET: ranked leaderboard
|
|-- components/
|   |-- layout/Navbar.tsx             # Top navigation bar
|   |-- groups/
|   |   |-- GroupCard.tsx             # Group card: matches + standings
|   |   |-- GroupStandingsTable.tsx   # Standings table (P/W/D/L/GF/GA/GD/Pts)
|   |   |-- MatchScoreInput.tsx       # Score input row for a group match
|   |-- knockout/
|   |   |-- BracketView.tsx           # Responsive bracket container
|   |   |-- BracketRound.tsx          # Single round column/section
|   |   |-- KnockoutMatch.tsx         # Clickable match card
|   |-- standings/
|   |   |-- QualifiedTeamsGrid.tsx    # Grid of 32 qualified teams
|   |   |-- ThirdPlaceTable.tsx       # Ranked third-place teams
|   |-- multiplayer/
|   |   |-- CreateGameForm.tsx        # Create game form
|   |   |-- JoinGameForm.tsx          # Join game form
|   |   |-- GameCodeDisplay.tsx       # Display 6-char game code
|   |   |-- PlayerList.tsx            # List of players in game
|   |   |-- RoundControls.tsx         # Lock predictions (host-only)
|   |   |-- LeaderboardTable.tsx      # Points leaderboard
|   |   |-- PredictionComparison.tsx  # Side-by-side prediction comparison
|   |   |-- PredictionProvider.tsx    # Local TournamentContext for predictions
|   |-- shared/
|       |-- TeamBadge.tsx             # Flag emoji + team name
|       |-- ScoreInput.tsx            # Number input 0-99
|       |-- ResetButton.tsx           # Button with confirmation dialog
|
|-- lib/
|   |-- types.ts                      # Core TypeScript interfaces
|   |-- utils.ts                      # cn() classname merge helper
|   |-- store.tsx                     # TournamentProvider, Context, reducer, localStorage
|   |
|   |-- data/                         # Static tournament data
|   |   |-- teams.ts                  # 48 teams (id, name, FIFA ranking, confederation, flag)
|   |   |-- groups.ts                 # 12 groups (A-L) with team assignments
|   |   |-- fixtures.ts              # 72 group matches (auto-generated round-robin)
|   |   |-- bracket-template.ts       # 32 knockout match templates with slot strings
|   |   |-- third-place-clusters.ts   # 8 slots with group-eligibility constraints
|   |
|   |-- engine/                       # Pure tournament logic
|   |   |-- tournament.ts             # Main orchestrator: computeTournament()
|   |   |-- group-standings.ts        # Group standings calculation
|   |   |-- tiebreakers.ts            # FIFA tiebreaker cascade (8 criteria)
|   |   |-- best-third-place.ts       # Rank and select 8 best third-place teams
|   |   |-- knockout-bracket.ts       # CSP backtracking for 3rd-place slots + bracket population
|   |   |-- rounds.ts                 # Round key → match ID mapping
|   |   |-- scoring.ts               # Prediction scoring (tiered points)
|   |   |-- __tests__/               # Unit tests for all engine modules
|   |
|   |-- supabase/                     # Supabase integration
|       |-- client.ts                 # Browser Supabase client
|       |-- server.ts                 # Server Supabase client + service role client
|       |-- auth.ts                   # Anonymous session management
|       |-- use-game.ts               # React hook: fetch game, subscribe to changes
|       |-- hydrate-predictions.ts    # Convert DB prediction rows → TournamentState
|
|-- supabase-schema.sql               # Full database schema + RLS policies
|-- netlify.toml                      # Netlify deployment config
|-- vitest.config.ts                  # Vitest test runner config
|-- package.json                      # Dependencies & scripts
|-- tsconfig.json                     # TypeScript config
```

---

## 5. Tech Stack & Dependencies

### Runtime

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.2.7 | React framework (App Router, API routes, SSR) |
| React | 19.2.4 | UI library |
| TypeScript | 5.x | Type safety |
| Supabase JS | 2.107.0 | Database client, auth, realtime |
| Supabase SSR | 0.10.3 | Server-safe Supabase client |

### Styling

| Technology | Version | Purpose |
|-----------|---------|---------|
| Tailwind CSS | 4.x | Utility-first CSS |
| @tailwindcss/postcss | 4.x | PostCSS integration |

### Dev & Testing

| Technology | Version | Purpose |
|-----------|---------|---------|
| Vitest | 4.1.8 | Unit test runner |
| jsdom | 29.x | DOM simulation for tests |
| @testing-library/react | 16.x | Component testing utilities |
| ESLint | 9.x | Code linting |

### Infrastructure

| Service | Purpose |
|---------|---------|
| Netlify | Hosting, CDN, serverless functions |
| Supabase | PostgreSQL database, anonymous auth, realtime subscriptions |
| GitHub | Source control (github.com/mxmlrx13/fifa-wc2026-simulator) |

### NPM Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

---

## 6. Data Model & Static Data

### 6.1 TypeScript Types (`lib/types.ts`)

```typescript
// Group identifiers
type GroupId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L'

// A national team
interface Team {
  id: string                    // 3-letter code: "FRA", "BRA", "USA", etc.
  name: string                  // Full name: "France", "Brazil", etc.
  fifaRanking: number           // FIFA ranking (used as final tiebreaker)
  confederation: 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC'
  flagCode: string              // ISO 3166-1 alpha-2 lowercase for flag rendering
}

// A single group stage match
interface GroupMatch {
  id: number                    // Unique match ID (1-72)
  groupId: GroupId
  matchday: 1 | 2 | 3
  homeTeamId: string
  awayTeamId: string
  homeScore: number | null      // null = not yet predicted/played
  awayScore: number | null
}

// A team's standing within a group
interface GroupStanding {
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  position: number              // 1-4 within the group
  qualification: 'winner' | 'runner-up' | 'third' | 'eliminated'
}

// A knockout stage match template
interface KnockoutMatch {
  id: number                    // 73-104
  round: 'R32' | 'R16' | 'QF' | 'SF' | '3RD' | 'F'
  homeSlot: string              // Slot string: "1A", "2B", "3{A,B,C,D,F}", "W73", "L101"
  awaySlot: string
  homeTeamId: string | null     // Resolved team ID (null if slot not yet resolved)
  awayTeamId: string | null
  winnerId: string | null       // Player's pick for the winner
}

// A third-place team's qualification result
interface ThirdPlaceResult {
  teamId: string
  groupId: GroupId
  standing: GroupStanding
  qualified: boolean
  matchSlot: number | null      // Which knockout match they're assigned to
}

// The full state of a tournament prediction
interface TournamentState {
  groupMatches: GroupMatch[]           // All 72 group matches with scores
  knockoutMatches: KnockoutMatch[]     // All 32 knockout match templates
  knockoutPicks: Record<number, string> // matchId → winnerId picks
}
```

### 6.2 Static Data Files

**`lib/data/teams.ts`** — All 48 qualified teams:
- Each team has: `id`, `name`, `fifaRanking`, `confederation`, `flagCode`
- Exported as both an array (`teams`) and a lookup map (`teamsMap`)
- Flag rendering uses Unicode regional indicator symbols (with special cases for England, Scotland, Wales)

**`lib/data/groups.ts`** — 12 groups (A through L):
- Each group: `{ id: GroupId, teamIds: [string, string, string, string] }`
- Based on the official FIFA World Cup 2026 draw

**`lib/data/fixtures.ts`** — 72 group stage matches:
- Auto-generated round-robin: each group produces 6 matches across 3 matchdays
- Match IDs 1-72, assigned sequentially by group and matchday
- Matchday pairing order: MD1 = (1v2, 3v4), MD2 = (1v3, 4v2), MD3 = (4v1, 2v3)

**`lib/data/bracket-template.ts`** — 32 knockout matches:
- Match IDs 73-104
- Each match defines `homeSlot` and `awaySlot` as strings:
  - `"1A"` = winner of Group A
  - `"2B"` = runner-up of Group B
  - `"3{A,B,C,D,F}"` = a third-place team from one of those groups (assigned by CSP solver)
  - `"W73"` = winner of match 73
  - `"L101"` = loser of match 101 (used for 3rd-place match)
- Rounds: R32 (16 matches), R16 (8), QF (4), SF (2), 3RD (1), F (1)

**`lib/data/third-place-clusters.ts`** — 8 third-place knockout slots:
- Each slot: `{ matchId: number, opponentSlot: string, allowedGroups: GroupId[] }`
- Constraints define which groups' third-place teams can fill each slot
- These constraints ensure geographic/scheduling feasibility per FIFA rules

---

## 7. Tournament Engine

All engine modules live in `lib/engine/` and are pure functions with no side effects.

### 7.1 Tournament Orchestrator (`tournament.ts`)

**Function:** `computeTournament(state: TournamentState)`

**Returns:**
```typescript
{
  groupStandings: Record<GroupId, GroupStanding[]>
  thirdPlaceResults: ThirdPlaceResult[]
  knockoutMatches: KnockoutMatch[]     // With resolved team IDs
  allGroupsComplete: boolean
  champion: string | null
}
```

**Algorithm:**
1. For each group: calculate standings from match scores
2. If all groups complete: rank third-place teams, select best 8
3. Run CSP backtracking to assign third-place teams to bracket slots
4. Populate bracket: resolve all slot strings to team IDs
5. Apply knockout picks (winnerId) to cascade through bracket
6. If final has a winner: set champion

### 7.2 Group Standings (`group-standings.ts`)

**Function:** `calculateGroupStandings(matches, groupId, teamIds, teamsMap)`

**Algorithm:**
1. Initialize standing record for each team (0 across all fields)
2. For each completed match: update W/D/L, GF/GA, points (W=3, D=1, L=0)
3. Sort teams using tiebreaker cascade
4. Assign positions 1-4 and qualification labels

### 7.3 Tiebreakers (`tiebreakers.ts`)

**Function:** `sortByTiebreakers(standings, matches, teamsMap)`

Implements the full FIFA tiebreaker cascade for group stage:

| Priority | Criterion | Implementation |
|----------|-----------|----------------|
| 1 | Points | Higher is better |
| 2 | Head-to-head points | Among tied teams only, recalculate points from mutual matches |
| 3 | Head-to-head goal difference | GF - GA in mutual matches |
| 4 | Head-to-head goals scored | GF in mutual matches |
| 5 | Overall goal difference | GF - GA across all group matches |
| 6 | Overall goals scored | GF across all group matches |
| 7 | Fair play | Not implemented in v1 (skipped) |
| 8 | FIFA ranking | Lower ranking number = better |

**Recursive behavior:** When 3+ teams are tied on a criterion, and applying the next criterion separates them into subgroups, the cascade restarts within each subgroup.

### 7.4 Best Third-Place Selection (`best-third-place.ts`)

**Function:** `rankThirdPlaceTeams(groupStandings, teamsMap)`

**Algorithm:**
1. Collect the third-place team from each of the 12 groups
2. Sort by: points (desc) → goal difference (desc) → goals scored (desc) → FIFA ranking (asc)
3. Top 8 teams marked `qualified: true`
4. Bottom 4 teams marked `qualified: false` (eliminated)

### 7.5 Knockout Bracket Resolution (`knockout-bracket.ts`)

#### Third-Place Slot Assignment

**Function:** `assignThirdPlaceToSlots(qualifiedThirdPlaceTeams, slotConstraints)`

**Algorithm:** Constraint Satisfaction Problem (CSP) with backtracking
- **Variables:** 8 bracket slots (each needs exactly 1 team)
- **Domain:** 8 qualified third-place teams
- **Constraints:** Each slot has an `allowedGroups` array; the assigned team's group must be in this array
- **Search:** Recursive depth-first with backtracking
  - For each slot, try each unassigned team
  - If the team's group is allowed, assign and recurse
  - If no valid assignment exists, backtrack

This is necessary because FIFA's bracket structure has specific slots for third-place teams, and not every third-place team can go in every slot. The constraints reflect real FIFA scheduling rules.

#### Bracket Population

**Function:** `populateBracket(state, groupStandings, thirdPlaceAssignments)`

**Slot resolution rules:**
- `"1A"` → `groupStandings['A'][0].teamId` (Group A winner)
- `"2B"` → `groupStandings['B'][1].teamId` (Group B runner-up)
- `"3{A,B,C,D,F}"` → look up which third-place team was assigned to this slot
- `"W73"` → `knockoutPicks[73]` (winner of match 73)
- `"L101"` → the team that lost match 101 (used for 3rd-place match)

### 7.6 Rounds (`rounds.ts`)

Maps round keys to match ID ranges:

| Round Key | Label | Match IDs | Count |
|-----------|-------|-----------|-------|
| `group_md1` | Group Stage — Matchday 1 | 1-24 | 24 |
| `group_md2` | Group Stage — Matchday 2 | 25-48 | 24 |
| `group_md3` | Group Stage — Matchday 3 | 49-72 | 24 |
| `r32` | Round of 32 | 73-88 | 16 |
| `r16` | Round of 16 | 89-96 | 8 |
| `qf` | Quarter-Finals | 97-100 | 4 |
| `sf` | Semi-Finals | 101-102 | 2 |
| `final` | Final | 103-104 | 2 |

Note: Match 103 is the third-place match, match 104 is the final.

**Utility functions:**
- `getMatchIdsForRound(roundKey)` → array of match IDs
- `getRoundForMatchId(matchId)` → round key
- `getRoundLabel(roundKey)` → human-readable label
- `getAllRounds()` → ordered array of all round keys
- `isGroupRound(roundKey)` → boolean

---

## 8. State Management

### 8.1 Solo Mode: TournamentProvider (`lib/store.tsx`)

**Pattern:** React Context + `useReducer` (Redux-like)

**Actions:**
```typescript
type TournamentAction =
  | { type: 'SET_MATCH_SCORE'; matchId: number; homeScore: number | null; awayScore: number | null }
  | { type: 'SET_KNOCKOUT_WINNER'; matchId: number; winnerId: string }
  | { type: 'RESET_GROUP'; groupId: GroupId }
  | { type: 'RESET_KNOCKOUT' }
  | { type: 'RESET_ALL' }
  | { type: 'HYDRATE'; state: TournamentState }
```

**Context value:**
```typescript
interface TournamentContextValue {
  state: TournamentState
  dispatch: React.Dispatch<TournamentAction>
  groupStandings: Record<GroupId, GroupStanding[]>
  thirdPlaceResults: ThirdPlaceResult[]
  knockoutMatches: KnockoutMatch[]      // With resolved teams
  allGroupsComplete: boolean
  champion: string | null
}
```

**Persistence:**
- localStorage key: `fifa-wc2026-simulator-state`
- Hydrated on mount (client-side only, after React hydration)
- Auto-saves on every state change via `useEffect`

**Smart invalidation:**
- When group scores change → `computeTournament()` runs
- If the set of qualifying teams changed → all knockout picks are cleared
- This prevents situations where a player picks Brazil to win in R32, then changes group scores such that Brazil doesn't qualify

### 8.2 Multiplayer Mode: PredictionProvider (`components/multiplayer/PredictionProvider.tsx`)

**Purpose:** Provides a local, isolated `TournamentContext` for the prediction page, without affecting the global solo-mode state.

**How it works:**
1. Creates its own `useReducer(tournamentReducer, initialState)`
2. Wraps children in `TournamentContext.Provider`
3. Runs `computeTournament(state)` on every state change
4. Exposes the same `TournamentContextValue` interface

**Why this works:** All shared components (GroupCard, KnockoutMatch, etc.) call `useContext(TournamentContext)`. When rendered inside `PredictionProvider`, they get the local multiplayer state. When rendered outside it (solo mode), they get the global state. Zero code changes to components.

**Props:**
- `initialState?` — Pre-populated state (for resuming saved predictions)
- `onStateChange?` — Callback fired on every state change (used to track dirty state for save button)

---

## 9. Database Schema & Supabase Integration

### 9.1 Tables

#### `games`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| code | TEXT (unique) | 6-character uppercase game code |
| name | TEXT | Game display name |
| current_round | TEXT | Current result batch being entered (default: 'group_md1') |
| round_locked | BOOLEAN | Legacy field (default: false) |
| predictions_locked | BOOLEAN | Whether predictions are locked (default: false) |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### `players`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| auth_id | UUID | Supabase anonymous user ID |
| game_id | UUID (FK → games) | Which game this player belongs to |
| display_name | TEXT | Player's chosen name |
| is_host | BOOLEAN | Whether this player created the game |
| created_at | TIMESTAMPTZ | Join timestamp |
| UNIQUE | (game_id, display_name) | No duplicate names per game |

#### `predictions`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| player_id | UUID (FK → players) | Who made this prediction |
| game_id | UUID (FK → games) | Which game |
| match_id | INTEGER | Match number (1-104) |
| round | TEXT | Round key (e.g., 'group_md1', 'r32') |
| home_score | INTEGER | Predicted home score (group matches) |
| away_score | INTEGER | Predicted away score (group matches) |
| winner_id | TEXT | Predicted winner team ID (knockout matches) |
| submitted_at | TIMESTAMPTZ | Last update timestamp |
| UNIQUE | (player_id, game_id, match_id) | One prediction per match per player |

#### `official_results`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| game_id | UUID (FK → games) | Which game |
| match_id | INTEGER | Match number |
| home_score | INTEGER | Actual home score |
| away_score | INTEGER | Actual away score |
| winner_id | TEXT | Actual winner (for knockout ties/penalties) |
| entered_at | TIMESTAMPTZ | Entry timestamp |
| UNIQUE | (game_id, match_id) | One result per match per game |

#### `scores`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| player_id | UUID (FK → players) | Which player |
| game_id | UUID (FK → games) | Which game |
| match_id | INTEGER | Match number |
| points | INTEGER | Points earned (0, 1, 3, or 5) |
| prediction_home | INTEGER | What the player predicted (home) |
| prediction_away | INTEGER | What the player predicted (away) |
| actual_home | INTEGER | What actually happened (home) |
| actual_away | INTEGER | What actually happened (away) |
| UNIQUE | (player_id, game_id, match_id) | One score per match per player |

### 9.2 Row Level Security

All tables have RLS enabled. Current policies are permissive (anyone can read/write) — access control is enforced at the API route level (checking host status, game membership, lock state). This is a known simplification for v1.

### 9.3 Realtime Subscriptions

Two Supabase Realtime subscriptions are active:

1. **`useGame()` hook** — Subscribes to `UPDATE` events on the `games` table for the current game ID. When the host locks predictions or changes the current round, all connected clients see the update immediately.

2. **`LeaderboardTable` component** — Subscribes to `INSERT` events on the `scores` table for the current game ID. When the host enters results and scores are computed, the leaderboard auto-refreshes.

### 9.4 Auth Model

- **Anonymous sessions:** `ensureAnonymousSession()` in `lib/supabase/auth.ts` creates an anonymous Supabase session if none exists. No email, password, or OAuth required.
- **Session persistence:** Supabase handles session storage in the browser automatically.
- **Limitation:** Sessions are browser-specific. A player can't access their predictions from a different browser or device.

### 9.5 Client Configuration

- **Browser client** (`lib/supabase/client.ts`): Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables
- **Server client** (`lib/supabase/server.ts`): Same env vars, plus `SUPABASE_SERVICE_ROLE_KEY` for privileged operations

---

## 10. API Routes

### POST `/api/games`

**Purpose:** Create a new multiplayer game.

**Request body:**
```json
{ "name": "Family Pool", "displayName": "Maxime" }
```

**Logic:**
1. Authenticate user (anonymous session)
2. Generate random 6-character uppercase code
3. Insert into `games` table
4. Insert creator into `players` table with `is_host: true`
5. Return `{ code, gameId }`

---

### GET `/api/games/[code]`

**Purpose:** Fetch game details, player list, and identify current user.

**Response:**
```json
{
  "game": { "id": "...", "code": "WC26AB", "name": "Family Pool", "predictions_locked": false, ... },
  "players": [
    { "id": "...", "displayName": "Maxime", "isHost": true },
    { "id": "...", "displayName": "Pierre", "isHost": false }
  ],
  "currentPlayer": { "id": "...", "displayName": "Maxime", "isHost": true }
}
```

---

### POST `/api/games/[code]/join`

**Purpose:** Add a player to an existing game.

**Request body:**
```json
{ "displayName": "Pierre" }
```

**Validation:**
- Game must exist
- Display name must be unique within the game
- User must be authenticated

---

### GET `/api/games/[code]/predictions?round=group_md1`

**Purpose:** Fetch predictions for a game.

**Logic:**
- If predictions are NOT locked: returns only the current player's predictions
- If predictions ARE locked: returns all players' predictions
- Optional `round` query parameter filters by round

---

### POST `/api/games/[code]/predictions`

**Purpose:** Save a player's predictions (all 104 matches at once).

**Request body:**
```json
{
  "predictions": [
    { "matchId": 1, "homeScore": 2, "awayScore": 1 },
    { "matchId": 2, "homeScore": 0, "awayScore": 0 },
    { "matchId": 73, "winnerId": "BRA" },
    ...
  ]
}
```

**Validation:**
- Predictions must not be locked
- Player must be in the game
- Group matches (1-72) must have homeScore + awayScore
- Knockout matches (73-104) must have winnerId
- Upserts on `(player_id, game_id, match_id)`

---

### POST `/api/games/[code]/results`

**Purpose:** Enter official results for a batch of matches and compute all player scores.

**Request body:**
```json
{
  "results": [
    { "matchId": 1, "homeScore": 2, "awayScore": 1 },
    { "matchId": 73, "homeScore": 1, "awayScore": 1, "winnerId": "BRA" }
  ],
  "batch": "group_md1"
}
```

**Logic:**
1. Verify caller is host
2. Validate match IDs belong to the specified batch
3. Upsert into `official_results`
4. Fetch all players' predictions for those matches
5. Compute points for each prediction:
   - Group matches: use `computePoints()` (tiered scoring)
   - Knockout matches: 3 pts if `winnerId` matches, 0 otherwise
6. Upsert into `scores`
7. Return `{ resultsEntered, scoresComputed }`

---

### PATCH `/api/games/[code]/round`

**Purpose:** Host game management actions.

**Actions:**
- `{ "action": "lock" }` — Sets `predictions_locked = true`. No more prediction changes allowed.
- `{ "action": "set_result_batch", "batch": "r32" }` — Updates `current_round` on the game record.

---

### GET `/api/games/[code]/leaderboard`

**Purpose:** Return ranked leaderboard.

**Logic:**
1. Aggregate `scores` table: `SUM(points)` grouped by `player_id`
2. Join with `players` for display names
3. Sort by total points descending
4. Return ranked array

---

## 11. Frontend Components

### 11.1 Layout & Navigation

**`Navbar`** — Fixed top navigation bar with links to Groups, Standings, Knockout, Summary, and Play (multiplayer). Highlights the current page. Responsive hamburger menu on mobile.

**`app/layout.tsx`** — Root layout wrapping the entire app in `TournamentProvider`. Includes `<Navbar />`, global CSS, and font configuration.

### 11.2 Group Components

**`GroupCard`** — The primary group interaction component.
- Renders all 6 matches for a group, organized by matchday tabs
- Each match uses `MatchScoreInput` for score entry
- Below matches: `GroupStandingsTable` showing live standings
- Progress indicator showing how many matches have scores
- Reset button (with confirmation) to clear all scores in the group
- Reads from `TournamentContext` — works in both solo and multiplayer modes

**`MatchScoreInput`** — A single match row.
- Shows home team (flag + name), two `ScoreInput` fields, away team (flag + name)
- Dispatches `SET_MATCH_SCORE` action on input change
- Visual feedback: subtle background color when both scores are filled

**`GroupStandingsTable`** — Classic football standings table.
- Columns: Pos, Team, P, W, D, L, GF, GA, GD, Pts
- Row colors indicate qualification status:
  - Green = winner (advances)
  - Blue = runner-up (advances)
  - Yellow = third place (may advance)
  - No color = eliminated

### 11.3 Knockout Components

**`BracketView`** — Responsive bracket container.
- Desktop (lg+): horizontal layout, rounds flow left-to-right
- Mobile: vertical layout, rounds stacked top-to-bottom
- Renders each round using `BracketRound`

**`BracketRound`** — A column/section of matches for one round.
- Header with round name (e.g., "Quarter-Finals")
- Lists `KnockoutMatch` cards for that round

**`KnockoutMatch`** — A single knockout match card.
- Shows two teams (or slot placeholders like "Winner M73" if teams aren't resolved yet)
- Teams are clickable — clicking picks that team as the winner
- Selected winner gets a gold accent highlight
- If a team isn't resolved yet (null), the slot is shown as a gray placeholder

### 11.4 Standings Components

**`QualifiedTeamsGrid`** — Grid showing all 32 qualified teams.
- Organized by qualification path: 12 group winners, 12 runners-up, 8 third-place
- Each team shown as a `TeamBadge`

**`ThirdPlaceTable`** — Ranked list of all 12 third-place teams.
- Shows position, team, group, points, GD, GF
- Top 8 highlighted as qualified, bottom 4 as eliminated

### 11.5 Multiplayer Components

**`CreateGameForm`** — Two inputs (game name, display name) + submit button. On success, redirects to game dashboard.

**`JoinGameForm`** — Two inputs (6-char code, display name) + submit button. Code input auto-uppercases. On success, redirects to game dashboard.

**`GameCodeDisplay`** — Large, centered display of the 6-character code with a copy-to-clipboard button and visual feedback.

**`PlayerList`** — Vertical list of players in the game. Shows display name, host badge, and highlights the current user. Shows player count.

**`RoundControls`** — Host-only panel.
- Shows prediction status (OPEN / LOCKED) with colored badge
- "Lock All Predictions" button (only visible to host, only when predictions are open)
- Confirmation before locking

**`LeaderboardTable`** — Points leaderboard.
- Columns: Rank, Player, Points
- `compact` mode shows top 5 only (for dashboard embed)
- Full mode shows all players with detailed breakdown
- Subscribes to Supabase Realtime for live updates

**`PredictionComparison`** — Side-by-side comparison table.
- Rows = matches in the selected round
- Columns = players
- Cells show predicted score (group) or predicted winner (knockout)
- Only visible when predictions are locked

**`PredictionProvider`** — Context wrapper (described in Section 8.2).

### 11.6 Shared Components

**`TeamBadge`** — Renders a team's flag emoji and name/code. Sizes: sm, md, lg.

**`ScoreInput`** — Compact number input (0-99). Custom styling removes browser spinners. Controlled component with `value` and `onChange`.

**`ResetButton`** — Button that shows a confirmation dialog before executing. Used for clearing group scores and resetting the bracket.

---

## 12. Scoring System

### 12.1 Group Match Scoring (`lib/engine/scoring.ts`)

**Function:** `computePoints(predictedHome, predictedAway, actualHome, actualAway)`

| Tier | Condition | Points | Example |
|------|-----------|--------|---------|
| Exact | Predicted score = actual score | **5** | Predict 2-1, actual 2-1 |
| Result + GD | Correct result (W/D/L) AND correct goal difference | **3** | Predict 3-1, actual 2-0 (both home win by 2) |
| Result only | Correct result (W/D/L) but wrong goal difference | **1** | Predict 1-0, actual 3-1 (both home win, different GD) |
| Wrong | Wrong result | **0** | Predict 1-0, actual 0-2 |

**Result determination:**
- Home win: `homeScore > awayScore` → result = 1
- Draw: `homeScore === awayScore` → result = 0
- Away win: `homeScore < awayScore` → result = -1
- Both predicted and actual results are compared using `Math.sign(home - away)`

### 12.2 Knockout Match Scoring

- **Correct winner pick:** 3 points
- **Wrong winner pick:** 0 points
- No partial credit for knockout matches
- For tied knockout matches (penalties), the host selects the actual winner via a UI picker

### 12.3 Maximum Possible Score

- 72 group matches × 5 points = 360
- 32 knockout matches × 3 points = 96
- **Total maximum: 456 points**

### 12.4 Leaderboard Aggregation

Points are summed per player across all scored matches. The leaderboard is sorted by:
1. Total points (descending)
2. Number of exact predictions (descending) — tiebreaker

---

## 13. Multiplayer Flow (End-to-End)

### Phase 1: Game Setup

```
Host                                    Server                          Database
 |                                        |                               |
 |-- POST /api/games ------------------>  |                               |
 |   { name, displayName }               |                               |
 |                                        |-- Generate 6-char code -----> |
 |                                        |-- INSERT games ------------> |
 |                                        |-- INSERT players (host) ---> |
 |   <-- { code: "WC26AB" } ------------ |                               |
 |                                        |                               |
 |   Share code with friends              |                               |
 |                                        |                               |
Friend                                   |                               |
 |-- POST /api/games/WC26AB/join ------>  |                               |
 |   { displayName }                      |-- INSERT players ----------> |
 |   <-- { success } ------------------- |                               |
```

### Phase 2: Predictions

```
Player                                  Server                          Database
 |                                        |                               |
 |-- Navigate to /play/WC26AB/predict     |                               |
 |                                        |                               |
 |   [Fill in group scores locally]       |                               |
 |   [Standings compute client-side]      |                               |
 |   [Bracket populates client-side]      |                               |
 |   [Pick knockout winners locally]      |                               |
 |                                        |                               |
 |-- POST /api/games/WC26AB/predictions ->|                               |
 |   { predictions: [{matchId, ...}×104] }|                               |
 |                                        |-- Check predictions_locked -->|
 |                                        |   (must be false)             |
 |                                        |-- UPSERT predictions ------> |
 |   <-- { saved: 104 } ---------------- |                               |
```

### Phase 3: Lock & Results

```
Host                                    Server                          Database
 |                                        |                               |
 |-- PATCH /api/games/WC26AB/round -----> |                               |
 |   { action: "lock" }                   |-- UPDATE games.locked=true -> |
 |                                        |                               |
 |                                        |   [Realtime: all clients get  |
 |                                        |    updated game state]        |
 |                                        |                               |
 |-- POST /api/games/WC26AB/results ----> |                               |
 |   { results: [...], batch: "md1" }     |                               |
 |                                        |-- UPSERT official_results --> |
 |                                        |-- SELECT predictions -------> |
 |                                        |   (for batch match IDs)       |
 |                                        |                               |
 |                                        |-- computePoints() for each    |
 |                                        |   prediction vs result        |
 |                                        |                               |
 |                                        |-- UPSERT scores -------------> |
 |                                        |                               |
 |   <-- { resultsEntered, scoresComputed }                               |
 |                                        |                               |
 |                                        |   [Realtime: leaderboard      |
 |                                        |    components auto-refresh]   |
```

---

## 14. Styling & Design System

### 14.1 Framework

Tailwind CSS v4 with `@tailwindcss/postcss`. No component library — all UI is custom-built with utility classes.

### 14.2 Theme (`globals.css`)

**Color palette:**
```css
--color-background: #f8f9fb       /* Light gray page background */
--color-foreground: #1e293b       /* Dark slate text */
--color-card: #ffffff             /* White card backgrounds */
--color-card-border: rgba(0,0,0,0.08)  /* Subtle card borders */
--color-accent: #a3882a          /* Gold — primary action color */
--color-accent-glow: rgba(163,136,42,0.15)  /* Gold glow */
--color-neon-blue: #2563eb       /* Info, runner-up highlights */
--color-neon-green: #059669      /* Success, winner highlights */
--color-neon-red: #dc2626        /* Error, lock indicators */
```

**Aesthetic:** Clean, modern, slightly "premium" sports feel. Gold accent evokes the World Cup trophy. Glass-morphism inspired cards with subtle borders and shadows.

### 14.3 Custom CSS Classes

```css
.glass-card      /* Card with border, rounded-xl, subtle shadow */
.glow-accent     /* Gold box-shadow glow */
.glow-green      /* Green box-shadow glow */
.glow-blue       /* Blue box-shadow glow */
```

### 14.4 Animations

```css
@keyframes fadeIn    { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp   { from { opacity: 0; transform: translateY(10px) } to { ... } }
@keyframes pulse-glow { 0%,100% { box-shadow: 0 0 15px accent } 50% { box-shadow: 0 0 25px accent } }
```

Utility classes: `.animate-fadeIn`, `.animate-slideUp`, `.animate-pulse-glow`

### 14.5 Responsive Breakpoints

Standard Tailwind breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)

Key responsive behaviors:
- Group cards: 1 column on mobile, 2 on md, 3 on lg
- Bracket: vertical stacked on mobile, horizontal flow on lg+
- Leaderboard: full table on md+, compact on mobile
- Navigation: horizontal links on md+, hamburger on mobile

### 14.6 Input Styling

Custom number inputs: browser spinners removed via `-webkit-appearance: none`. Light gray background, rounded, accent-colored focus ring.

---

## 15. Testing

### 15.1 Framework

Vitest 4.1.8 with jsdom environment. Tests live in `lib/engine/__tests__/`.

### 15.2 Test Coverage

| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| `group-standings.test.ts` | 4 | Basic standings calculation, tiebreakers, incomplete groups |
| `tiebreakers.test.ts` | 5 | Head-to-head tiebreakers, 3-way ties, FIFA ranking fallback |
| `best-third-place.test.ts` | 4 | Third-place ranking, qualification cutoff, edge cases |
| `knockout-bracket.test.ts` | 4 | CSP solver correctness, slot resolution, bracket cascading |
| `rounds.test.ts` | 5 | Round-to-match-ID mapping, getRoundForMatchId, labels |
| `scoring.test.ts` | 4 | All four scoring tiers (exact, result+GD, result, wrong) |

**Total: 26 tests, all passing.**

### 15.3 Running Tests

```bash
npm run test        # Run once
npm run test:watch  # Watch mode
```

---

## 16. Deployment & Infrastructure

### 16.1 Hosting: Netlify

**Configuration (`netlify.toml`):**
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

- The `@netlify/plugin-nextjs` plugin handles Next.js SSR via Netlify Functions
- Static pages are served from CDN
- Dynamic routes (API, server-rendered pages) run as serverless functions
- Edge functions handle Next.js middleware

**Production URL:** https://fifa-wc2026-predictions.netlify.app

### 16.2 Database: Supabase

- Hosted PostgreSQL with built-in Auth and Realtime
- Anonymous auth enabled (no email/password setup required)
- Realtime enabled on `games` and `scores` tables

### 16.3 Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

These must be set in both:
- `.env.local` for local development
- Netlify dashboard → Site settings → Environment variables (for production)

### 16.4 Source Control

- Repository: https://github.com/mxmlrx13/fifa-wc2026-simulator
- Branch: `main`
- No CI/CD pipeline configured — deployments are manual via `npx netlify-cli deploy --prod`

---

## 17. Current Limitations & Known Gaps

### Security
- **RLS policies are permissive** — All tables allow all operations. Access control is enforced at the API route level, not the database level. A determined user could bypass API routes and write directly to the database using the anon key. This should be tightened with proper RLS policies that check `auth.uid()`.
- **No rate limiting** — API routes have no rate limiting. A malicious user could spam game creation or prediction saves.
- **Anonymous auth is device-bound** — Players can't recover their session from another browser or device.

### Features Not Yet Built
- **No real-time prediction saving** — The predict page requires manually clicking "Save." Auto-save or save-on-navigate would improve UX.
- **No notification system** — Players aren't notified when predictions are locked or results are entered. They must check the dashboard manually.
- **No game deletion or player removal** — Once created, games persist indefinitely. There's no way to remove a player or delete a game.
- **No prediction editing after lock** — Even for matches that haven't been played yet, predictions can't be changed once locked. A per-round locking mechanism would be more flexible.
- **No mobile-optimized bracket** — The bracket view works on mobile but is cramped. A dedicated mobile bracket UI would improve the experience.
- **Fair play tiebreaker not implemented** — The FIFA tiebreaker cascade skips the "fair play" criterion (step 7). This is rarely decisive in practice.
- **No match schedule/times** — Matches don't have dates or kick-off times. Integrating the real match schedule would allow automatic deadline-based locking.
- **No social sharing** — No way to share game codes or results on social media.
- **No admin panel** — Game management (deleting games, removing players, resetting results) must be done directly in the Supabase dashboard.

### Technical Debt
- **No error boundaries** — React error boundaries are not implemented. A crashing component takes down the entire page.
- **No loading skeletons** — Pages show generic "Loading..." text instead of skeleton UI.
- **No optimistic updates** — API calls block the UI until complete. Optimistic updates would make interactions feel faster.
- **`proxy.ts` and `deno.lock` are orphaned files** — These sit in the project root but aren't part of the app. They should be removed or gitignored.

---

## 18. Glossary

| Term | Meaning |
|------|---------|
| **Batch** | A group of matches that results are entered for at once (e.g., "Matchday 1" = 24 matches) |
| **Bracket** | The knockout stage tree structure, from R32 to Final |
| **Confederation** | FIFA's continental governing bodies: UEFA, CONMEBOL, CONCACAF, CAF, AFC, OFC |
| **CSP** | Constraint Satisfaction Problem — algorithmic technique used for third-place slot assignment |
| **GD** | Goal Difference (goals scored minus goals conceded) |
| **GF** | Goals For (total goals scored) |
| **GA** | Goals Against (total goals conceded) |
| **Head-to-head** | Comparison restricted to matches between the tied teams only |
| **Host** | The player who created the multiplayer game; has admin privileges |
| **Knockout pick** | A player's prediction for who wins a knockout match |
| **Matchday** | One of three rounds within the group stage (MD1, MD2, MD3) |
| **R32** | Round of 32 (first knockout round, 16 matches) |
| **R16** | Round of 16 (8 matches) |
| **QF** | Quarter-finals (4 matches) |
| **SF** | Semi-finals (2 matches) |
| **3RD** | Third-place match (match 103) |
| **F** | Final (match 104) |
| **RLS** | Row Level Security — Supabase/PostgreSQL feature for database-level access control |
| **Slot** | A placeholder in the bracket template (e.g., "1A" = Group A winner, "W73" = winner of match 73) |
| **Third-place cluster** | A bracket slot that accepts third-place teams from specific groups |
| **Upsert** | Insert or update — if a row with the same unique key exists, update it; otherwise insert |
