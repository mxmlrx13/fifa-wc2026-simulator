#!/usr/bin/env node
/**
 * Seed a demo game with 4 players, full group predictions, champion picks,
 * locked group round, MD1 official results, computed scores, and a leaderboard
 * snapshot.
 *
 * Usage: node scripts/seed-demo.mjs
 * Requires: SUPABASE_DB_URL in .env.local
 *
 * Prints the game code on success.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import pg from 'pg'

const { Client } = pg

// ── Load env ──

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx)
      const val = trimmed.slice(eqIdx + 1)
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* ignore */ }
}

loadEnv()

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error('ERROR: SUPABASE_DB_URL not found in .env.local')
  process.exit(1)
}

// ── Groups + fixtures (replicated from lib/data to avoid import issues) ──

const groups = {
  A: ['MEX', 'ZAF', 'KOR', 'CZE'],
  B: ['CAN', 'BIH', 'QAT', 'CHE'],
  C: ['BRA', 'MAR', 'HTI', 'SCO'],
  D: ['USA', 'PRY', 'AUS', 'TUR'],
  E: ['DEU', 'CUW', 'CIV', 'ECU'],
  F: ['NLD', 'JPN', 'SWE', 'TUN'],
  G: ['BEL', 'EGY', 'IRN', 'NZL'],
  H: ['ESP', 'CPV', 'SAU', 'URY'],
  I: ['FRA', 'SEN', 'IRQ', 'NOR'],
  J: ['ARG', 'DZA', 'AUT', 'JOR'],
  K: ['PRT', 'COD', 'UZB', 'COL'],
  L: ['ENG', 'HRV', 'GHA', 'PAN'],
}

const rankings = {
  MEX: 15, ZAF: 59, KOR: 22, CZE: 36, CAN: 33, BIH: 57, QAT: 45, CHE: 19,
  BRA: 5, MAR: 13, HTI: 87, SCO: 39, USA: 11, PRY: 52, AUS: 24, TUR: 26,
  DEU: 3, CUW: 93, CIV: 40, ECU: 30, NLD: 7, JPN: 17, SWE: 43, TUN: 44,
  BEL: 6, EGY: 35, IRN: 20, NZL: 99, ESP: 8, CPV: 62, SAU: 56, URY: 14,
  FRA: 2, SEN: 21, IRQ: 63, NOR: 47, ARG: 1, DZA: 37, AUT: 23, JOR: 68,
  PRT: 9, COD: 55, UZB: 65, COL: 12, ENG: 10, HRV: 16, GHA: 48, PAN: 46,
}

function generateFixtures() {
  const fixtures = []
  let matchId = 1
  for (const [, teamIds] of Object.entries(groups)) {
    const [t1, t2, t3, t4] = teamIds
    fixtures.push({ id: matchId++, home: t1, away: t2, matchday: 1 })
    fixtures.push({ id: matchId++, home: t3, away: t4, matchday: 1 })
    fixtures.push({ id: matchId++, home: t1, away: t3, matchday: 2 })
    fixtures.push({ id: matchId++, home: t4, away: t2, matchday: 2 })
    fixtures.push({ id: matchId++, home: t4, away: t1, matchday: 3 })
    fixtures.push({ id: matchId++, home: t2, away: t3, matchday: 3 })
  }
  return fixtures
}

// Seeded PRNG (mulberry32) — matches lib/engine/quick-fill.ts
function seededRandom(seed) {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function generateScore(homeId, awayId, seed) {
  const homeRank = rankings[homeId] ?? 50
  const awayRank = rankings[awayId] ?? 50
  const gap = awayRank - homeRank
  const r1 = seededRandom(seed)
  const r2 = seededRandom(seed + 7919)
  let h = Math.floor(r1 * 3)
  let a = Math.floor(r2 * 3)
  if (gap > 20) h = Math.min(h + 1, 4)
  else if (gap < -20) a = Math.min(a + 1, 4)
  if (gap > 50) h = Math.min(h + 1, 4)
  else if (gap < -50) a = Math.min(a + 1, 4)
  return [h, a]
}

// Scoring — matches lib/engine/scoring.ts
function computePoints(pH, pA, aH, aA) {
  if (pH === aH && pA === aA) return 5
  const predResult = Math.sign(pH - pA)
  const actualResult = Math.sign(aH - aA)
  if (predResult !== actualResult) return 0
  if ((pH - pA) === (aH - aA)) return 3
  return 1
}

// ── Main ──

const fixtures = generateFixtures()
const md1Fixtures = fixtures.filter((f) => f.matchday === 1)
const championPicks = ['BRA', 'ARG', 'FRA', 'DEU']
const playerNames = ['Alice', 'Bob', 'Carol', 'Dave']

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()

  // Generate a 6-char code
  const code = 'DEMO' + String(Math.floor(Math.random() * 90 + 10))

  // Create game
  const { rows: [game] } = await client.query(
    `INSERT INTO games (code, name) VALUES ($1, $2) RETURNING id, code`,
    [code, `Demo Game ${code}`],
  )
  console.log(`Game created: ${game.code} (id: ${game.id})`)

  // Create 4 players with fake auth_ids
  const playerIds = []
  for (let i = 0; i < 4; i++) {
    const fakeAuthId = `00000000-0000-0000-0000-00000000000${i + 1}`
    const { rows: [player] } = await client.query(
      `INSERT INTO players (auth_id, game_id, display_name, is_host, champion_pick)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [fakeAuthId, game.id, playerNames[i], i === 0, championPicks[i]],
    )
    playerIds.push(player.id)
    console.log(`  Player ${playerNames[i]} (${championPicks[i]}): ${player.id}`)
  }

  // Create game rounds (group = open, rest = pending)
  const rounds = ['group', 'r32', 'r16', 'qf', 'sf', 'final']
  for (const round of rounds) {
    const status = round === 'group' ? 'locked' : 'pending'
    await client.query(
      `INSERT INTO game_rounds (game_id, round_key, status, opened_at, locked_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [game.id, round, status,
        round === 'group' ? new Date().toISOString() : null,
        round === 'group' ? new Date().toISOString() : null],
    )
  }
  console.log('  Rounds created (group=locked)')

  // Insert predictions for all 72 group matches per player
  let predCount = 0
  for (let pi = 0; pi < 4; pi++) {
    for (const f of fixtures) {
      // Each player gets a slightly different seed
      const [h, a] = generateScore(f.home, f.away, f.id + pi * 1000)
      const roundLabel = `group_md${f.matchday}`
      await client.query(
        `INSERT INTO predictions (player_id, game_id, match_id, round, home_score, away_score)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [playerIds[pi], game.id, f.id, roundLabel, h, a],
      )
      predCount++
    }
  }
  console.log(`  ${predCount} predictions inserted (72 per player)`)

  // Enter MD1 official results (24 matches)
  const officialResults = new Map()
  for (const f of md1Fixtures) {
    const [h, a] = generateScore(f.home, f.away, f.id + 9999) // different seed for "real" results
    await client.query(
      `INSERT INTO official_results (game_id, match_id, home_score, away_score)
       VALUES ($1, $2, $3, $4)`,
      [game.id, f.id, h, a],
    )
    officialResults.set(f.id, { h, a })
  }
  console.log(`  ${md1Fixtures.length} MD1 official results entered`)

  // Compute scores for MD1
  let scoreCount = 0
  for (let pi = 0; pi < 4; pi++) {
    for (const f of md1Fixtures) {
      const [predH, predA] = generateScore(f.home, f.away, f.id + pi * 1000)
      const actual = officialResults.get(f.id)
      const points = computePoints(predH, predA, actual.h, actual.a)
      await client.query(
        `INSERT INTO scores (player_id, game_id, match_id, points, prediction_home, prediction_away, actual_home, actual_away)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [playerIds[pi], game.id, f.id, points, predH, predA, actual.h, actual.a],
      )
      scoreCount++
    }
  }
  console.log(`  ${scoreCount} score rows computed`)

  // Compute leaderboard and write snapshot
  const { rows: allScores } = await client.query(
    `SELECT player_id, SUM(points)::int AS total,
            COUNT(*) FILTER (WHERE points = 5)::int AS exact,
            COUNT(*) FILTER (WHERE points > 0)::int AS correct
     FROM scores WHERE game_id = $1 GROUP BY player_id`,
    [game.id],
  )

  const ranked = allScores
    .sort((a, b) => b.total - a.total || b.exact - a.exact || b.correct - a.correct)

  // Assign shared ranks
  for (let i = 0; i < ranked.length; i++) {
    if (i === 0) { ranked[i].rank = 1; continue }
    const prev = ranked[i - 1]
    ranked[i].rank = (ranked[i].total === prev.total && ranked[i].exact === prev.exact && ranked[i].correct === prev.correct)
      ? prev.rank : i + 1
  }

  for (const entry of ranked) {
    await client.query(
      `INSERT INTO leaderboard_snapshots (game_id, batch, player_id, rank, points)
       VALUES ($1, $2, $3, $4, $5)`,
      [game.id, 'group_md1', entry.player_id, entry.rank, entry.total],
    )
  }
  console.log(`  Leaderboard snapshot written (group_md1)`)

  console.log(`\nDemo game ready: ${game.code}`)
  console.log('Open the app and navigate to /play/join, enter this code.')

} catch (err) {
  console.error('Seed failed:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
