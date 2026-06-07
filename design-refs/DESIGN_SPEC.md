# WC2026 Tipping — Design Spec, Direction A "Tricolore Editorial"

Authoritative design specification. Read together with `tokens.css` (exact values) and `screens.html` (visual reference for layout and feel). Where this document and an implementation idea conflict, this document wins. Where a functional requirement in CLAUDE_CODE_PROMPTS.md conflicts with a visual nicety, the functional requirement wins — log the conflict in DEVIATIONS.md.

## 1. Principles

1. **Editorial calm.** Warm paper background, white cards, hairline borders, generous whitespace. Structure comes from borders and type hierarchy, not shadows or glows. Delete the existing `.glow-*` and `.glass-card` aesthetics.
2. **Red is scarce.** Red marks only: the current user, exact-score/correct-pick chips, selected knockout picks, and destructive actions. If a screen shows more than ~2 red elements, something is wrong. Navy does all routine work.
3. **Numbers are content.** Scores, points, ranks always Inter 700/800 with `tabular-nums`. Fraunces (serif) is reserved for page titles, card/group titles, and celebration moments — never for data.
4. **France-neutral.** The palette references the tricolore; the product never references France. No team is preselected, promoted, sorted first, or styled differently. Flags appear only as data. (France appears in `screens.html` purely as sample data.)
5. **One primary action per screen.** Every screen has at most one navy primary button. Everything else is secondary or a link.

## 2. Typography

| Role | Font | Size/Weight | Usage |
|---|---|---|---|
| Page title | Fraunces 700 | 24px, -0.01em | "Predictions", "Breakdown", game name on Home |
| Card/section title | Fraunces 700 | 17px | "Group A", "Round of 32" |
| Section label | Inter 700 | 10px UPPERCASE, +0.09em, muted | "LEADERBOARD", "TOURNAMENT" |
| Body | Inter 400/500 | 13.5px | descriptions, helper text |
| Emphasis | Inter 600/700 | 13.5px | player names, team names |
| Sub | Inter 500 | 11px, muted | metadata, hints |
| Scores/points | Inter 800 tabular | 14–15px | all numerals in tables/inputs/chips |

Load Fraunces + Inter via `next/font/google` with CSS variables; subset latin.

## 3. Color usage rules

- Page bg `--color-paper`, cards `--color-card`, all borders `--color-line` at 1px (1.5px for inputs/picks).
- Primary buttons, bottom-nav active state, round-timeline "now", save pill: navy.
- Qualification colors (standings rows): 3px left border + soft bg — winner green, runner-up blue, third amber, eliminated none. Replaces the current full-row coloring.
- Status badges: open=green-soft, locked=gray-soft, awaiting-results=red-soft, neutral=sand. Always pill-shaped, 10.5px/600.
- Points chips: 5pts & correct KO pick = solid red/white; 3pts = green-soft; 1pt = blue-soft; 0 = sand/muted. Knockout chips show their value (3/4/5/6/8) in solid red when correct, sand when wrong.
- Dark mode: out of scope. Do not add.

## 4. Layout & responsive structure

### In-game shell (`/play/[code]/*`)
- **Mobile (<md):** bottom tab bar, 4 items: Home, Predict, Table (leaderboard+breakdown), More (compare, players, recovery link, leave/host actions). Fixed, card bg, hairline top border, active item navy with filled icon. Content gets `padding-bottom: 70px`. App bar on top: game name (Fraunces) + code (tap-to-copy) left, contextual status badge right, **2px navy bottom border** (the signature line of this direction).
- **Desktop (md+):** no bottom bar. Top in-game header: back link, game name + code left; round status badge + nav links (Home · Predict · Table · Compare) right; same 2px navy bottom rule. Content max-width 1080px, centered, 24px padding.
- The global/solo navbar (with the Groups/Standings/Knockout links) renders ONLY outside `/play/[code]/*`. The solo stepper and "Play %" chip never appear inside a game.

### Grid behavior
- Group cards: 1-col mobile, 2-col md, 3-col lg.
- Knockout fixtures: 1-col mobile, 2-col md+.
- Breakdown: single column mobile; desktop two columns of round cards with a sticky player rail on the left.
- Standings tables: full columns (P W D L GF GA GD Pts) on md+; condensed (P GD Pts) below md.

## 5. Components (states required)

| Component | States |
|---|---|
| Button primary / secondary / destructive / ghost | default, hover (darken 6%), active, disabled (out-soft bg, out-ink text), loading (spinner, keep width) |
| ScoreInput | empty (dashed border, "–"), focused (navy 1.5px border), filled (solid border, ink 800), locked (no border, plain text), error |
| KnockoutPick (team button) | unpicked, picked (red-soft bg, red 1.5px border, red ✓), locked-correct (green-soft), locked-wrong (sand, strikethrough none — just muted), unresolved slot (dashed, muted) |
| Badge | neutral, open, locked, live (awaiting results) |
| PointsChip | exact, gd, result, zero, pending ("–") |
| SavePill | saving ("Saving…", pulsing dot), saved ("Saved ✓"), error ("Retry", tap = manual save), hidden when nothing dirty |
| Skeleton | text line, card block, table row; paper-tone shimmer, no gray-blue |
| EmptyState | icon-free: cap-label + one body sentence + optional secondary button |
| Modal (lock, remove, transfer) | title Fraunces, body Inter, destructive button right, cancel ghost left |
| Timeline pill | done (green-soft ✓), now (navy), future (outline muted) |
| PlayerRow | default, you (red-soft + YOU tag), host (small "HOST" sand badge), with completion ("54/72", muted, tabular) |

## 6. Screen specs

Reference renderings: `screens.html` (mobile frames + desktop boards). Sample data in refs is illustrative only.

1. **Home/Dashboard — 3 phases** (phase from `game_rounds`):
   - *Predicting:* hero card = game code huge (Fraunces, letter-spaced) + tap-to-copy + share hint; players list with completion counts; primary CTA "Enter predictions"; host: secondary destructive "Lock group predictions" (modal confirm).
   - *Live:* leaderboard card first (top 3 + current user row if outside top 3, "+ n more" link), contextual primary CTA (host: enter results / player: enter open round picks / nothing open: ghost "View my predictions"), round timeline card, links row (Breakdown · Compare · Players).
   - *Finished:* champion celebration card (winner name Fraunces 28px, total), final top 3, links to breakdown/compare. No confetti libraries; one subtle fadeIn.
2. **Predict — group phase:** completion meter card (n/72 + champion pick summary, red progress bar), inline tabs Groups | Standings | Champion. Groups = group cards with matchday sub-tabs, score inputs. Standings = live partial tables + note "Based on n/72 predictions". Champion = 48-team grid (3-col mobile, 6-col desktop), one selectable, selected = red-soft + red border. Save pill fixed. After lock: same layout read-only, inputs become plain text, per-match chips once scored.
3. **Predict — knockout round:** round pills (R32 R16 QF SF F; open=navy, scored=green-soft ✓, pending=outline disabled), fixture cards with venue/match number cap-label, two tappable team rows, points-per-pick noted in app bar badge. Read-only states per §5.
4. **Breakdown:** player chip row (current first, "you" styling), round cards with subtotal right-aligned (Fraunces), match rows: fixture (flags+codes) / "tip x:y · result a:b" / points chip. Champion bonus card last.
5. **Leaderboard (full):** ranked rows, shared ranks rendered as same number, you-row highlighted, exact-count column md+, per-row link to that player's breakdown.
6. **Compare:** round selector (only locked/scored rounds), first column sticky/frozen on mobile, player columns scrollable, champion picks row when group is locked.
7. **Results entry (host):** batch pills with entered-count per batch ("MD1 24/24 ✓"), match rows with large inputs, tied-KO winner picker as two tappable team buttons (must pick to submit), sticky bottom bar: "n/24 entered" + primary submit, validation errors inline red. Third-place match and Final labeled distinctly.
8. **Create / Join / Recover:** single centered card on paper, Fraunces title, stacked inputs, primary button. Recovery-link modal after create/join: cap-label "SAVE YOUR RECOVERY LINK", link in sand box, copy button, one-sentence explanation.
9. **Landing + solo pages:** re-skin only (paper bg, navy/red accents, Fraunces titles, new buttons) — no structural changes to the solo simulator.

## 7. Motion

- `fadeIn` 180ms ease-out on page/card mount; `slideUp` 200ms for modals and save pill. Nothing else. Remove `pulse-glow`. Respect `prefers-reduced-motion`.

## 8. Don'ts

- No gradients, no glassmorphism, no glows, no dark mode, no emoji as UI icons (flags as data are fine), no more than one Fraunces size per card, no full-width red buttons except destructive confirmations, no France-specific anything (§1.4).
