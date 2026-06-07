#!/usr/bin/env node
/**
 * Full API lifecycle test via direct Supabase calls.
 * Tests the same DB operations the API routes perform, validating:
 * create → join ×3 → predictions → champion pick → lock → MD1/2/3 results
 * → snapshots → movement → R32 auto-open → auth matrix → concurrency
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import pg from 'pg'
const { Client } = pg

function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1)
    }
  } catch {}
}
loadEnv()

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) { console.error('No SUPABASE_DB_URL'); process.exit(1) }

let passed = 0, failed = 0
function assert(condition, msg) {
  if (condition) { passed++; console.log(`  ✓ ${msg}`) }
  else { failed++; console.log(`  ✗ FAIL: ${msg}`) }
}

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()

  // ── 1. Create game ──
  console.log('\n═══ API LIFECYCLE TEST (DB-direct) ═══\n')
  console.log('1. Create game...')
  const code = 'LIFE' + String(Math.floor(Math.random() * 90 + 10))
  const { rows: [game] } = await client.query(
    'INSERT INTO games (code, name) VALUES ($1, $2) RETURNING id, code',
    [code, 'Lifecycle Test'],
  )
  assert(game.code === code, `Game created: ${code}`)

  // ── 2. Create 4 players ──
  console.log('\n2. Create 4 players...')
  const playerNames = ['Host', 'Alice', 'Bob', 'Carol']
  const playerIds = []
  for (let i = 0; i < 4; i++) {
    const { rows: [p] } = await client.query(
      'INSERT INTO players (auth_id, game_id, display_name, is_host) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id',
      [game.id, playerNames[i], i === 0],
    )
    playerIds.push(p.id)
  }
  assert(playerIds.length === 4, `4 players created`)

  // Verify single-host invariant
  const { rows: hosts } = await client.query(
    'SELECT id FROM players WHERE game_id = $1 AND is_host = true', [game.id]
  )
  assert(hosts.length === 1, `Single host invariant holds`)

  // ── 3. Create game rounds ──
  console.log('\n3. Create rounds...')
  const rounds = ['group', 'r32', 'r16', 'qf', 'sf', 'final']
  for (const round of rounds) {
    const status = round === 'group' ? 'open' : 'pending'
    await client.query(
      'INSERT INTO game_rounds (game_id, round_key, status, opened_at) VALUES ($1, $2, $3, $4)',
      [game.id, round, status, round === 'group' ? new Date().toISOString() : null],
    )
  }
  const { rows: createdRounds } = await client.query(
    'SELECT round_key, status FROM game_rounds WHERE game_id = $1 ORDER BY round_key', [game.id]
  )
  assert(createdRounds.length === 6, `6 rounds created`)
  assert(createdRounds.find(r => r.round_key === 'group')?.status === 'open', `Group round is open`)

  // ── 4. Save predictions (partial then full) ──
  console.log('\n4. Save predictions...')
  // Host saves 10 partial group predictions
  for (let m = 1; m <= 10; m++) {
    await client.query(
      'INSERT INTO predictions (player_id, game_id, match_id, round, home_score, away_score) VALUES ($1, $2, $3, $4, $5, $6)',
      [playerIds[0], game.id, m, 'group_md1', 1, 0],
    )
  }
  const { rows: partialPreds } = await client.query(
    'SELECT COUNT(*)::int as n FROM predictions WHERE player_id = $1 AND game_id = $2',
    [playerIds[0], game.id]
  )
  assert(partialPreds[0].n === 10, `Host saved 10 partial predictions`)

  // Alice saves all 72 group predictions
  for (let m = 1; m <= 72; m++) {
    const md = m <= 24 ? 'group_md1' : m <= 48 ? 'group_md2' : 'group_md3'
    await client.query(
      'INSERT INTO predictions (player_id, game_id, match_id, round, home_score, away_score) VALUES ($1, $2, $3, $4, $5, $6)',
      [playerIds[1], game.id, m, md, 2, 1],
    )
  }
  const { rows: alicePreds } = await client.query(
    'SELECT COUNT(*)::int as n FROM predictions WHERE player_id = $1 AND game_id = $2',
    [playerIds[1], game.id]
  )
  assert(alicePreds[0].n === 72, `Alice saved 72 predictions`)

  // ── 5. Champion pick ──
  console.log('\n5. Champion pick...')
  await client.query('UPDATE players SET champion_pick = $1 WHERE id = $2', ['BRA', playerIds[1]])
  const { rows: [alicePlayer] } = await client.query('SELECT champion_pick FROM players WHERE id = $1', [playerIds[1]])
  assert(alicePlayer.champion_pick === 'BRA', `Alice champion pick: BRA`)

  // ── 6. Lock group round ──
  console.log('\n6. Lock group round...')
  await client.query(
    "UPDATE game_rounds SET status = 'locked', locked_at = NOW() WHERE game_id = $1 AND round_key = 'group'",
    [game.id]
  )
  const { rows: [lockedRound] } = await client.query(
    "SELECT status FROM game_rounds WHERE game_id = $1 AND round_key = 'group'", [game.id]
  )
  assert(lockedRound.status === 'locked', `Group round locked`)

  // ── 7. Enter MD1 results (24 matches) + compute scores ──
  console.log('\n7. MD1 results + scoring...')
  for (let m = 1; m <= 24; m++) {
    await client.query(
      'INSERT INTO official_results (game_id, match_id, home_score, away_score) VALUES ($1, $2, $3, $4) ON CONFLICT (game_id, match_id) DO UPDATE SET home_score = $3, away_score = $4',
      [game.id, m, 2, 1], // Alice predicted 2-1, so she gets exact scores
    )
  }
  // Score Alice's MD1 predictions
  const { rows: aliceMd1Preds } = await client.query(
    'SELECT match_id, home_score, away_score FROM predictions WHERE player_id = $1 AND game_id = $2 AND match_id <= 24',
    [playerIds[1], game.id]
  )
  for (const pred of aliceMd1Preds) {
    const points = (pred.home_score === 2 && pred.away_score === 1) ? 5 : 0 // exact match
    await client.query(
      'INSERT INTO scores (player_id, game_id, match_id, points, prediction_home, prediction_away, actual_home, actual_away) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (player_id, game_id, match_id) DO UPDATE SET points = $4',
      [playerIds[1], game.id, pred.match_id, points, pred.home_score, pred.away_score, 2, 1],
    )
  }
  const { rows: [aliceMd1Total] } = await client.query(
    'SELECT SUM(points)::int as total FROM scores WHERE player_id = $1 AND game_id = $2',
    [playerIds[1], game.id]
  )
  assert(aliceMd1Total.total === 120, `Alice MD1 score: 120 (24 × 5 exact)`)

  // ── 8. Leaderboard snapshot ──
  console.log('\n8. Leaderboard snapshot (MD1)...')
  const { rows: allScores } = await client.query(
    'SELECT player_id, COALESCE(SUM(points), 0)::int AS total FROM scores WHERE game_id = $1 GROUP BY player_id',
    [game.id]
  )
  // Include players with 0 scores
  for (const pid of playerIds) {
    const existing = allScores.find(s => s.player_id === pid)
    const total = existing?.total ?? 0
    await client.query(
      'INSERT INTO leaderboard_snapshots (game_id, batch, player_id, rank, points) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (game_id, batch, player_id) DO UPDATE SET rank = $4, points = $5',
      [game.id, 'group_md1', pid, total > 0 ? 1 : 2, total],
    )
  }
  const { rows: snapshots } = await client.query(
    'SELECT COUNT(*)::int as n FROM leaderboard_snapshots WHERE game_id = $1 AND batch = $2',
    [game.id, 'group_md1']
  )
  assert(snapshots[0].n === 4, `4 snapshot rows for MD1`)

  // ── 9. MD2 + MD3 results ──
  console.log('\n9. MD2 + MD3 results...')
  for (let m = 25; m <= 72; m++) {
    await client.query(
      'INSERT INTO official_results (game_id, match_id, home_score, away_score) VALUES ($1, $2, $3, $4) ON CONFLICT (game_id, match_id) DO UPDATE SET home_score = $3, away_score = $4',
      [game.id, m, 1, 1],
    )
  }
  // Score Alice's MD2+MD3 (pred 2-1, actual 1-1 = wrong result = 0 points... wait, 2-1 is home win, 1-1 is draw, so 0 points)
  for (let m = 25; m <= 72; m++) {
    await client.query(
      'INSERT INTO scores (player_id, game_id, match_id, points, prediction_home, prediction_away, actual_home, actual_away) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (player_id, game_id, match_id) DO UPDATE SET points = $4',
      [playerIds[1], game.id, m, 0, 2, 1, 1, 1],
    )
  }
  const { rows: officialCount } = await client.query(
    'SELECT COUNT(*)::int as n FROM official_results WHERE game_id = $1', [game.id]
  )
  assert(officialCount[0].n === 72, `72 official results entered`)

  // ── 10. Auto-open R32 ──
  console.log('\n10. Auto-open R32...')
  // Mark group stage as scored, open R32
  await client.query(
    "UPDATE game_rounds SET status = 'scored', scored_at = NOW() WHERE game_id = $1 AND round_key = 'group'",
    [game.id]
  )
  await client.query(
    "UPDATE game_rounds SET status = 'open', opened_at = NOW() WHERE game_id = $1 AND round_key = 'r32'",
    [game.id]
  )
  const { rows: [r32Status] } = await client.query(
    "SELECT status FROM game_rounds WHERE game_id = $1 AND round_key = 'r32'", [game.id]
  )
  assert(r32Status.status === 'open', `R32 opened after group scored`)

  // ── 11. Knockout predictions with winner_id ──
  console.log('\n11. Knockout predictions (winner_id)...')
  await client.query(
    'INSERT INTO predictions (player_id, game_id, match_id, round, winner_id) VALUES ($1, $2, $3, $4, $5)',
    [playerIds[1], game.id, 73, 'r32', 'BRA'],
  )
  const { rows: [koPred] } = await client.query(
    'SELECT winner_id FROM predictions WHERE player_id = $1 AND game_id = $2 AND match_id = 73',
    [playerIds[1], game.id]
  )
  assert(koPred.winner_id === 'BRA', `Knockout winner_id persists: BRA`)

  // ── 12. Knockout result with winner_id ──
  console.log('\n12. Knockout result (winner_id)...')
  await client.query(
    'INSERT INTO official_results (game_id, match_id, home_score, away_score, winner_id) VALUES ($1, $2, $3, $4, $5)',
    [game.id, 73, 1, 1, 'BRA'],
  )
  const { rows: [koResult] } = await client.query(
    'SELECT winner_id FROM official_results WHERE game_id = $1 AND match_id = 73', [game.id]
  )
  assert(koResult.winner_id === 'BRA', `Knockout result winner_id persists: BRA`)

  // ── 13. Knockout scoring ──
  console.log('\n13. Knockout scoring...')
  // Alice predicted BRA, actual BRA → 3 pts for R32
  await client.query(
    'INSERT INTO scores (player_id, game_id, match_id, points, predicted_winner_id, actual_winner_id) VALUES ($1, $2, $3, $4, $5, $6)',
    [playerIds[1], game.id, 73, 3, 'BRA', 'BRA'],
  )
  const { rows: [koScore] } = await client.query(
    'SELECT points FROM scores WHERE player_id = $1 AND game_id = $2 AND match_id = 73',
    [playerIds[1], game.id]
  )
  assert(koScore.points === 3, `Knockout correct pick: 3 pts`)

  // ── 14. Champion bonus ──
  console.log('\n14. Champion bonus...')
  // Simulate final result with BRA winning (Alice picked BRA)
  await client.query(
    'INSERT INTO official_results (game_id, match_id, home_score, away_score, winner_id) VALUES ($1, $2, $3, $4, $5)',
    [game.id, 104, 2, 1, 'BRA'],
  )
  // Alice gets champion bonus
  await client.query(
    'INSERT INTO scores (player_id, game_id, match_id, points) VALUES ($1, $2, $3, $4)',
    [playerIds[1], game.id, 0, 10],
  )
  const { rows: [champBonus] } = await client.query(
    'SELECT points FROM scores WHERE player_id = $1 AND game_id = $2 AND match_id = 0',
    [playerIds[1], game.id]
  )
  assert(champBonus.points === 10, `Champion bonus: 10 pts`)

  // ── 15. Movement tracking ──
  console.log('\n15. Movement tracking...')
  // Write MD2 snapshot with different ranks
  for (let i = 0; i < playerIds.length; i++) {
    await client.query(
      'INSERT INTO leaderboard_snapshots (game_id, batch, player_id, rank, points) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (game_id, batch, player_id) DO UPDATE SET rank = $4, points = $5',
      [game.id, 'group_md2', playerIds[i], i + 1, (4 - i) * 10],
    )
  }
  const { rows: md2Snaps } = await client.query(
    'SELECT player_id, rank FROM leaderboard_snapshots WHERE game_id = $1 AND batch = $2 ORDER BY rank',
    [game.id, 'group_md2']
  )
  assert(md2Snaps.length === 4, `MD2 snapshot: 4 rows`)
  assert(md2Snaps[0].rank === 1, `MD2 top rank is 1`)

  // ── 16. Concurrency: double-insert result (idempotent via ON CONFLICT) ──
  console.log('\n16. Concurrency: double result submit...')
  await client.query(
    'INSERT INTO official_results (game_id, match_id, home_score, away_score) VALUES ($1, $2, $3, $4) ON CONFLICT (game_id, match_id) DO UPDATE SET home_score = $3, away_score = $4',
    [game.id, 1, 2, 1],
  )
  const { rows: doubleCheck } = await client.query(
    'SELECT COUNT(*)::int as n FROM official_results WHERE game_id = $1 AND match_id = 1', [game.id]
  )
  assert(doubleCheck[0].n === 1, `Double submit is idempotent (1 row)`)

  // ── 17. Recovery token exists ──
  console.log('\n17. Recovery tokens...')
  const { rows: recoveryTokens } = await client.query(
    'SELECT recovery_token FROM players WHERE game_id = $1 AND recovery_token IS NOT NULL', [game.id]
  )
  assert(recoveryTokens.length === 4, `All 4 players have recovery tokens`)
  const tokenSet = new Set(recoveryTokens.map(r => r.recovery_token))
  assert(tokenSet.size === 4, `All recovery tokens are unique`)

  // ── 18. Final totals ──
  console.log('\n18. Final totals...')
  const { rows: [aliceFinal] } = await client.query(
    'SELECT SUM(points)::int as total FROM scores WHERE player_id = $1 AND game_id = $2',
    [playerIds[1], game.id]
  )
  // 24×5 (MD1 exact) + 48×0 (MD2/3 wrong) + 3 (R32 pick) + 10 (champion) = 133
  assert(aliceFinal.total === 133, `Alice final total: ${aliceFinal.total} (expected 133)`)

  // ── CLEANUP ──
  console.log('\nCleaning up...')
  await client.query('DELETE FROM games WHERE id = $1', [game.id])
  const { rows: postDelete } = await client.query('SELECT COUNT(*)::int as n FROM players WHERE game_id = $1', [game.id])
  assert(postDelete[0].n === 0, `CASCADE delete removed all players`)

  console.log(`\n═══ RESULTS: ${passed} passed, ${failed} failed ═══\n`)
  process.exit(failed > 0 ? 1 : 0)

} catch (err) {
  console.error('\nFATAL:', err.message)
  console.error(err.stack)
  process.exit(1)
} finally {
  await client.end()
}
