# Release Blockers

Status of issues found during the v1.0.0 pre-release audit.

---

## BLOCKER 1: Missing `winner_id` columns (Severity: CRITICAL) -- RESOLVED

MIGRATION-005.sql applied. Both `predictions.winner_id` and `official_results.winner_id` columns confirmed present.

## BLOCKER 2: Deadline enforcement flag is OFF (Severity: HIGH) -- RESOLVED

`NEXT_PUBLIC_ENABLE_DEADLINES=true` added to `.env.local`. Must also be set on Netlify.

## BLOCKER 3: No `SENTRY_DSN` configured (Severity: LOW) -- ACKNOWLEDGED

Proceeding without Sentry monitoring for v1.0.0. App gracefully degrades (no-op).

---

## Pre-Release Audit Results

### Step 1: Static Pass -- PASSED
- 17 test files, 225 tests, all green
- Clean production build (no warnings)
- No secret leakage in .next/static/ or git history
- No leftover TODO/FIXME/HACK in production code paths

### Step 2: Workflow Audit -- PASSED
- API lifecycle test: 24/24 assertions passed (create -> join x4 -> predictions -> champion -> lock -> MD1/2/3 results -> scoring -> snapshots -> R32 auto-open -> knockout winner_id -> knockout scoring -> champion bonus -> movement -> concurrency -> recovery tokens -> cascade delete)
- Auth matrix: All mutation routes properly auth-gated. GET routes accessible by game code (by design -- code is shared secret).
- Realtime subscriptions: 2 found (use-game.ts, LeaderboardTable.tsx), both properly cleaned up with removeChannel() in useEffect returns.
- Concurrency: Double-submit idempotent via ON CONFLICT.

### Step 3: UX/Quality Sweep -- PASSED
- No stray console.log/debug in production code
- No glass-card/glow-* design remnants
- No bare hex colors outside opengraph-image.tsx
- Largest bundle chunk: 410K (reasonable)

### Step 4: Pre-Deploy -- READY
- All tests green, build clean
- Netlify env vars needed: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_ENABLE_DEADLINES=true
- MIGRATION-005 applied

### Steps 5-7: Deploy, Live Smoke, Release -- PENDING
Awaiting deployment.
