# QA Manual Test Script

Estimated time: 20 minutes. Requires two browsers (e.g. Chrome + Firefox) and one phone/tablet.

---

## Setup

- **Browser A** = Chrome desktop (host)
- **Browser B** = Firefox desktop (player 2)
- **Device C** = Phone browser (player 3, optional but recommended)
- All three must reach the same deployment (localhost:3000 or production URL)

---

## 1. Create Game (Browser A)

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 1.1 | Navigate to `/play` | See "Multiplayer" landing with Create / Join options | [ ] |
| 1.2 | Click "Create Game" | See form with game name + display name inputs | [ ] |
| 1.3 | Enter name "World Cup Pool" + display name "Alice", submit | Redirect to `/play/[CODE]` dashboard. Recovery link modal shows | [ ] |
| 1.4 | Copy the recovery link from the modal, save it somewhere | Link is in format `/play/[CODE]/recover?token=...` | [ ] |
| 1.5 | Dismiss the modal | Dashboard shows in PREDICTING phase: hero code card, "Enter Predictions" CTA, player list (Alice, HOST badge, YOU badge) | [ ] |
| 1.6 | Verify game code is large Fraunces text, tap-to-copy works | Code copies to clipboard, toast or visual feedback | [ ] |

**Visual check vs `screens.html`:** Compare hero code card, player list styling, CTA button against the "Predicting" frame.

---

## 2. Join Game (Browser B)

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 2.1 | Navigate to `/play/join` | See join form with code + display name inputs | [ ] |
| 2.2 | Enter the 6-char code from step 1 + display name "Bob" | Redirect to `/play/[CODE]` dashboard. Recovery link modal shows | [ ] |
| 2.3 | Dismiss recovery modal | Dashboard shows "Enter Predictions" CTA. Player list: Alice (HOST), Bob (YOU) | [ ] |
| 2.4 | Verify Browser A's player list updates in real-time | Alice's dashboard now shows 2 players: Alice (HOST, YOU), Bob | [ ] |

---

## 3. Predict with Auto-Save (Browser B)

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 3.1 | Click "Enter Predictions" | Navigate to `/play/[CODE]/predict`. See Groups tab with 12 GroupCards | [ ] |
| 3.2 | Fill in scores for 4-5 matches in Group A | Live standings table updates as you type | [ ] |
| 3.3 | Switch to Standings tab | See "Based on n/72 predictions" note. Shows partial standings | [ ] |
| 3.4 | Fill remaining group predictions (all 72) | All groups complete. Standings show full tables | [ ] |
| 3.5 | Switch to Knockout tab | Bracket view loads with qualified teams from standings | [ ] |
| 3.6 | Click through bracket: pick all R32 → R16 → QF → SF → 3rd → Final winners | Bracket fills in progressively. Winner selections show red highlight | [ ] |
| 3.7 | Click "Save" | Save pill shows success state. Return to dashboard | [ ] |

---

## 4. Champion Pick (Browser B)

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 4.1 | On predict page, find Champion tab/section | 48-team grid visible, one selectable | [ ] |
| 4.2 | Select a team (e.g. Brazil) | Team gets red-soft bg + red border. Only one selectable at a time | [ ] |
| 4.3 | Save predictions | Champion pick persists | [ ] |

---

## 5. Recovery Link Flow (Device C / Incognito)

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 5.1 | Open an incognito window or Device C | Fresh session, no game context | [ ] |
| 5.2 | Navigate to the recovery link saved in step 1.4 | Page loads, shows "Recovering access..." then redirects to dashboard | [ ] |
| 5.3 | Verify Alice's dashboard loads with all data intact | Player list, predictions, everything matches | [ ] |
| 5.4 | Verify original Browser A session is now disconnected | Refreshing Browser A shows "Not in this game" or prompts to rejoin | [ ] |

---

## 6. Lock Predictions (Browser A or recovered session)

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 6.1 | On host dashboard, find "Lock Group Stage predictions" button | Button is visible, styled as destructive (red border) | [ ] |
| 6.2 | Click lock button | Modal appears: "Lock Group Stage predictions?" with player count and warning about irreversibility | [ ] |
| 6.3 | Confirm lock | Modal closes. Round timeline shows Group Stage as "locked" (gray badge) | [ ] |
| 6.4 | Verify Browser B sees the lock in real-time | Dashboard updates: "Enter Predictions" changes to "View my predictions" (read-only) | [ ] |

**Visual check:** Lock modal styling against `screens.html` modal frame.

---

## 7. Enter MD1 Results (Host)

> **Before entering results:** run `npm run backup` to snapshot current data.

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 7.1 | Dashboard shows "Enter Results" as host CTA | CTA links to `/play/[CODE]/results` | [ ] |
| 7.2 | Navigate to results page | Batch pills visible: MD1 (navy/selected), MD2, MD3, R32... (outlined) | [ ] |
| 7.3 | Enter scores for all 24 MD1 matches | Counter shows "24/24 entered" | [ ] |
| 7.4 | Click "Submit 24 Results" | Sticky bar shows "Saving & Computing Scores..." then "Results Saved & Scores Computed!" (green) | [ ] |
| 7.5 | MD1 pill now shows checkmark and green-soft styling | "MD1 24/24 ✓" | [ ] |

**Visual check:** Match rows with score inputs, batch pills, sticky submit bar against `screens.html` Results Entry frame.

---

## 8. Breakdown Chips (Browser B)

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 8.1 | Navigate to `/play/[CODE]/breakdown` | Player chip row at top. Current player (Bob) first with YOU tag | [ ] |
| 8.2 | See round cards with scored matches | Group Stage card shows subtotal. Match rows show "tip x:y · result a:b" + PointsChip | [ ] |
| 8.3 | Click another player's chip (Alice) | Data switches to Alice's breakdown. Scores visible for scored rounds only | [ ] |
| 8.4 | On desktop: sticky player rail on left, 2-column card grid | Layout matches spec | [ ] |
| 8.5 | On mobile: horizontal scrollable chips, single column | Layout matches spec | [ ] |

**Visual check:** Round card layout, PointsChip colors (red=5, green=3, blue=1, sand=0), Fraunces subtotals.

---

## 9. Knockout Round Auto-Open

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 9.1 | Host enters remaining MD2 + MD3 results | After MD3 submit: Group Stage round auto-transitions to "scored" | [ ] |
| 9.2 | Dashboard shows R32 round as "open" | Round timeline: Group ✓, R32 (navy/current) | [ ] |
| 9.3 | Browser B sees "Enter R32 picks" CTA | Player can now predict R32 matches | [ ] |

---

## 10. R32 Picks on Real Bracket (Browser B)

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 10.1 | Navigate to predict page for R32 | Bracket shows with real teams from official results | [ ] |
| 10.2 | Pick winners for all 16 R32 matches | Selections highlight in red. Each pick propagates to next round | [ ] |
| 10.3 | Save R32 predictions | Save succeeds | [ ] |

---

## 11. Host Transfer (Browser A)

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 11.1 | On host dashboard, find star icon next to Bob in player list | Star icon visible for non-host players | [ ] |
| 11.2 | Click star icon for Bob | Modal: "Transfer Host? Make Bob the host? You will lose lock and results powers." | [ ] |
| 11.3 | Confirm transfer | Modal closes. Alice loses HOST badge. Bob gets HOST badge | [ ] |
| 11.4 | Alice's dashboard no longer shows host-only actions | No lock/results buttons | [ ] |
| 11.5 | Bob's dashboard (Browser B) now shows host actions | Lock/results CTA visible | [ ] |

---

## 12. Final + Champion Bonus

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 12.1 | Host (now Bob) locks remaining rounds, enters all results through Final | Each batch submits correctly. Rounds auto-transition | [ ] |
| 12.2 | When entering Final result: if tied score, winner picker appears | Two team buttons below the match. Must pick to submit | [ ] |
| 12.3 | After Final submit: champion bonus computed | Scores table includes match_id=0 rows. Correct pickers get +10 | [ ] |

---

## 13. Finished Dashboard

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 13.1 | All rounds scored → dashboard shows FINISHED phase | Celebration card: "Tournament Complete" + game name (Fraunces 28px) | [ ] |
| 13.2 | Final leaderboard shows all players with correct totals | Shared ranks rendered correctly. Champion bonus reflected | [ ] |
| 13.3 | Breakdown and Compare links work | Navigate to breakdown → player data visible. Compare → all rounds available | [ ] |

**Visual check:** Finished dashboard against `screens.html` Finished frame. No confetti, just subtle fadeIn.

---

## 14. Leaderboard Detail

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 14.1 | Navigate to `/play/[CODE]/leaderboard` | Full leaderboard with all players, YOU row highlighted (red-soft bg) | [ ] |
| 14.2 | Exact-count column visible on desktop | "Exact" column shows on md+ breakpoint | [ ] |
| 14.3 | Click a player row | Navigates to that player's breakdown | [ ] |

---

## 15. Compare View

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 15.1 | Navigate to `/play/[CODE]/compare` | Round selector shows only locked/scored rounds | [ ] |
| 15.2 | Select a round | Table shows all players' predictions for that round | [ ] |
| 15.3 | First column (match fixture) is frozen/sticky on mobile | Scroll horizontally — fixture column stays fixed | [ ] |
| 15.4 | Champion picks row visible when group is locked | Shows each player's champion pick | [ ] |

---

## 16. Edge Cases

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 16.1 | Try to access `/play/INVALID` | "Game not found" with back link | [ ] |
| 16.2 | Non-host tries to access results page | "Only the host can enter results" message | [ ] |
| 16.3 | Host tries to lock already-locked round | Error or no-op. No crash | [ ] |
| 16.4 | Refresh dashboard mid-flow | State persists. No data loss | [ ] |

---

## 17. Phase 2 Features (Prompts 9-14)

| # | Action | Expected | Pass |
|---|--------|----------|------|
| 17.1 | Open app in fresh browser profile (no localStorage), navigate to `/play/[CODE]` | Onboarding flow appears (full-screen, 5 steps) | [ ] |
| 17.2 | Tap through all 5 onboarding steps | Each step has progress dots, Skip button on steps 1-4 | [ ] |
| 17.3 | Click Skip on step 2 | Jumps to step 5 (last step with CTA). Skip never traps the user | [ ] |
| 17.4 | Complete onboarding, join game, reload page | Onboarding does NOT reappear (localStorage flag persists) | [ ] |
| 17.5 | Find "How it works" link in dashboard | Clicking it re-opens onboarding in "back" mode (no join CTA) | [ ] |
| 17.6 | Create 2 games from the same browser | Navigate to `/play` → My Games hub shows both games with codes | [ ] |
| 17.7 | Open predict page, click "Quick Fill" | All 72 group scores auto-fill with plausible scores (0-4). Standings update | [ ] |
| 17.8 | Edit a few quick-filled scores manually | Edited scores persist, quick-fill doesn't overwrite them on re-fill | [ ] |
| 17.9 | On dashboard, find "Share Invite" button | Copies/shares game link. Button shows "Copied!" feedback | [ ] |
| 17.10 | Paste shared link in a real chat app | Link preview shows OG image + game name (if deployed) | [ ] |
| 17.11 | Lock predictions with 2+ players, navigate to `/play/[CODE]/consensus` | Champion votes, group winner consensus, boldest picks visible | [ ] |
| 17.12 | Run `npm run seed:demo`, join demo game | Dashboard shows locked group, MD1 results scored | [ ] |
| 17.13 | Enter MD2 results on demo game | Leaderboard updates. Movement arrows show (up/down/new) | [ ] |
| 17.14 | Check breakdown page after MD1 results | Round recap card shows subtotals, PointsChip colors correct | [ ] |
| 17.15 | Countdown badge visible on predict page (before kickoff) | Shows "locks in Xd Xh", no layout shift when timer ticks | [ ] |
| 17.16 | After group deadline passes (or simulate), predictions auto-lock even if host didn't lock | Effective status = locked. "Enter Predictions" becomes read-only | [ ] |

---

## Visual Parity Checklist

Compare each screen against `design-refs/screens.html`:

| Screen | Paper bg | Fraunces titles | Navy buttons | Red accents (scarce) | Hairline borders | Pass |
|--------|----------|-----------------|--------------|---------------------|-----------------|------|
| Dashboard (Predicting) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Dashboard (Live) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Dashboard (Finished) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Predict (Groups) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Predict (Knockout) | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Breakdown | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Leaderboard | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Compare | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Results Entry | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Lock Modal | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Create / Join | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Recovery Link | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

---

## 18. Pre-Release Audit (automated)

- [x] 18.1 All 225 unit/integration tests pass (17 files)
- [x] 18.2 Production build clean (no warnings)
- [x] 18.3 No secret leakage in .next/static/ or git history
- [x] 18.4 API lifecycle test: 24/24 assertions (create->join->predict->lock->score->knockout->champion->cleanup)
- [x] 18.5 Auth matrix: all mutations auth-gated, GET routes scoped by game code
- [x] 18.6 Realtime subscriptions: all cleaned up in useEffect returns
- [x] 18.7 No stray console.log/debug in production code
- [x] 18.8 No glass-card/glow-* design remnants
- [x] 18.9 No bare hex colors outside opengraph-image.tsx
- [x] 18.10 Bundle: largest chunk 410K (acceptable)
- [x] 18.11 MIGRATION-005 applied (winner_id columns)
- [x] 18.12 NEXT_PUBLIC_ENABLE_DEADLINES=true set
- [ ] 18.13 Netlify env vars set (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_ENABLE_DEADLINES)
- [ ] 18.14 Production deploy successful
- [ ] 18.15 Live smoke test: create game, join, predict, lock, enter results
- [ ] Jun 27: compare app R32 fixtures against the official bracket; use Adjust R32 fixtures if they differ.

---

## Sign-off

| Tester | Date | All checks pass? | Notes |
|--------|------|-------------------|-------|
| | | | |
