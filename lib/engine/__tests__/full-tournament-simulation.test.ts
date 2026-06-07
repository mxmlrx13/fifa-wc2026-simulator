import { describe, it, expect } from 'vitest'
import { computePoints } from '../scoring'
import {
  getKnockoutPointsForMatch,
  CHAMPION_BONUS,
  CHAMPION_BONUS_MATCH_ID,
  GROUP_MATCH_MAX_ID,
  PREDICTION_ROUND_RANGES,
} from '@/lib/constants'
import { groupFixtures } from '@/lib/data/fixtures'
import { bracketTemplate } from '@/lib/data/bracket-template'
import { groups } from '@/lib/data/groups'
import { teams } from '@/lib/data/teams'

// ---------------------------------------------------------------------------
// Seeded PRNG — mulberry32
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

// ---------------------------------------------------------------------------
// Naive scoring implementation (independent from production code)
// ---------------------------------------------------------------------------

function naiveGroupPoints(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
): number {
  // Exact score
  if (predHome === actualHome && predAway === actualAway) return 5

  const predResult = Math.sign(predHome - predAway)
  const actualResult = Math.sign(actualHome - actualAway)

  if (predResult !== actualResult) return 0

  const predDiff = predHome - predAway
  const actualDiff = actualHome - actualAway

  if (predDiff === actualDiff) return 3

  return 1
}

function naiveKnockoutPointsForMatch(matchId: number): number {
  // Per-match overrides first
  if (matchId === 103) return 6 // third place
  if (matchId === 104) return 8 // final

  // Round-based
  if (matchId >= 73 && matchId <= 88) return 3  // R32
  if (matchId >= 89 && matchId <= 96) return 4  // R16
  if (matchId >= 97 && matchId <= 100) return 5 // QF
  if (matchId >= 101 && matchId <= 102) return 6 // SF

  return 3 // fallback
}

// ---------------------------------------------------------------------------
// Synthetic data generators
// ---------------------------------------------------------------------------

interface GroupPrediction {
  matchId: number
  homeScore: number
  awayScore: number
}

interface KnockoutPick {
  matchId: number
  pickedTeam: string
}

interface GroupResult {
  matchId: number
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
}

interface KnockoutResult {
  matchId: number
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
  winnerId: string
}

interface PlayerData {
  id: string
  groupPredictions: GroupPrediction[]
  knockoutPicks: KnockoutPick[]
  championPick: string
}

function generateGroupPredictions(rng: () => number): GroupPrediction[] {
  const preds: GroupPrediction[] = []
  for (let matchId = 1; matchId <= GROUP_MATCH_MAX_ID; matchId++) {
    preds.push({
      matchId,
      homeScore: randInt(rng, 0, 4),
      awayScore: randInt(rng, 0, 4),
    })
  }
  return preds
}

function generateGroupResults(rng: () => number): GroupResult[] {
  return groupFixtures.map((fixture) => ({
    matchId: fixture.id,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    homeScore: randInt(rng, 0, 4),
    awayScore: randInt(rng, 0, 4),
  }))
}

function generateKnockoutResults(rng: () => number): KnockoutResult[] {
  return bracketTemplate.map((match) => {
    const homeTeamId = `T_${match.id}_H`
    const awayTeamId = `T_${match.id}_A`
    const homeScore = randInt(rng, 0, 4)
    const awayScore = randInt(rng, 0, 4)
    // If tied, pick a winner randomly
    const winnerId =
      homeScore !== awayScore
        ? homeScore > awayScore
          ? homeTeamId
          : awayTeamId
        : rng() < 0.5
          ? homeTeamId
          : awayTeamId
    return { matchId: match.id, homeTeamId, awayTeamId, homeScore, awayScore, winnerId }
  })
}

function generateKnockoutPicks(
  rng: () => number,
  knockoutResults: KnockoutResult[],
): KnockoutPick[] {
  return knockoutResults.map((result) => ({
    matchId: result.matchId,
    pickedTeam: rng() < 0.5 ? result.homeTeamId : result.awayTeamId,
  }))
}

function generatePlayers(
  n: number,
  rng: () => number,
  knockoutResults: KnockoutResult[],
): PlayerData[] {
  const allTeamIds = teams.map((t) => t.id)
  const players: PlayerData[] = []
  for (let i = 0; i < n; i++) {
    players.push({
      id: `player_${i}`,
      groupPredictions: generateGroupPredictions(rng),
      knockoutPicks: generateKnockoutPicks(rng, knockoutResults),
      championPick: pick(rng, allTeamIds),
    })
  }
  return players
}

// ---------------------------------------------------------------------------
// Naive total score computation (completely independent of production code)
// ---------------------------------------------------------------------------

function naiveTotalScore(
  player: PlayerData,
  groupResults: GroupResult[],
  knockoutResults: KnockoutResult[],
): { total: number; groupTotal: number; knockoutTotal: number; championBonusAwarded: number } {
  // Group scoring
  let groupTotal = 0
  for (const pred of player.groupPredictions) {
    const result = groupResults.find((r) => r.matchId === pred.matchId)!
    groupTotal += naiveGroupPoints(pred.homeScore, pred.awayScore, result.homeScore, result.awayScore)
  }

  // Knockout scoring
  let knockoutTotal = 0
  for (const kPick of player.knockoutPicks) {
    const result = knockoutResults.find((r) => r.matchId === kPick.matchId)!
    if (kPick.pickedTeam === result.winnerId) {
      knockoutTotal += naiveKnockoutPointsForMatch(kPick.matchId)
    }
  }

  // Champion bonus
  const finalResult = knockoutResults.find((r) => r.matchId === 104)!
  const championBonusAwarded = player.championPick === finalResult.winnerId ? CHAMPION_BONUS : 0

  return {
    total: groupTotal + knockoutTotal + championBonusAwarded,
    groupTotal,
    knockoutTotal,
    championBonusAwarded,
  }
}

// ---------------------------------------------------------------------------
// Production total score computation
// ---------------------------------------------------------------------------

function productionTotalScore(
  player: PlayerData,
  groupResults: GroupResult[],
  knockoutResults: KnockoutResult[],
): { total: number; groupTotal: number; knockoutTotal: number; championBonusAwarded: number } {
  // Group scoring — use production computePoints
  let groupTotal = 0
  for (const pred of player.groupPredictions) {
    const result = groupResults.find((r) => r.matchId === pred.matchId)!
    const { points } = computePoints(pred.homeScore, pred.awayScore, result.homeScore, result.awayScore)
    groupTotal += points
  }

  // Knockout scoring — use production getKnockoutPointsForMatch
  let knockoutTotal = 0
  for (const kPick of player.knockoutPicks) {
    const result = knockoutResults.find((r) => r.matchId === kPick.matchId)!
    if (kPick.pickedTeam === result.winnerId) {
      knockoutTotal += getKnockoutPointsForMatch(kPick.matchId)
    }
  }

  // Champion bonus
  const finalResult = knockoutResults.find((r) => r.matchId === 104)!
  const championBonusAwarded = player.championPick === finalResult.winnerId ? CHAMPION_BONUS : 0

  return {
    total: groupTotal + knockoutTotal + championBonusAwarded,
    groupTotal,
    knockoutTotal,
    championBonusAwarded,
  }
}

// ---------------------------------------------------------------------------
// Theoretical maximum
// ---------------------------------------------------------------------------

// 72 group matches * 5 (exact) = 360
// R32: 16 matches * 3 = 48
// R16: 8 matches * 4 = 32
// QF: 4 matches * 5 = 20
// SF: 2 matches * 6 = 12
// 3rd place: 1 match * 6 = 6
// Final: 1 match * 8 = 8
// Champion bonus: 10
// Total: 360 + 48 + 32 + 20 + 12 + 6 + 8 + 10 = 496
const THEORETICAL_MAX = 496

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Full tournament simulation', () => {
  const SEED = 42
  const N_PLAYERS = 4

  // Generate all data with a deterministic PRNG
  const rng = mulberry32(SEED)
  const groupResults = generateGroupResults(rng)
  const knockoutResults = generateKnockoutResults(rng)
  const players = generatePlayers(N_PLAYERS, rng, knockoutResults)

  it('generates 72 group results', () => {
    expect(groupResults).toHaveLength(72)
    for (const r of groupResults) {
      expect(r.homeScore).toBeGreaterThanOrEqual(0)
      expect(r.homeScore).toBeLessThanOrEqual(4)
      expect(r.awayScore).toBeGreaterThanOrEqual(0)
      expect(r.awayScore).toBeLessThanOrEqual(4)
    }
  })

  it('generates 32 knockout results with valid winners', () => {
    expect(knockoutResults).toHaveLength(32)
    for (const r of knockoutResults) {
      expect(r.matchId).toBeGreaterThanOrEqual(73)
      expect(r.matchId).toBeLessThanOrEqual(104)
      expect([r.homeTeamId, r.awayTeamId]).toContain(r.winnerId)
    }
  })

  it('generates 72 group predictions per player with scores 0-4', () => {
    for (const player of players) {
      expect(player.groupPredictions).toHaveLength(72)
      for (const pred of player.groupPredictions) {
        expect(pred.homeScore).toBeGreaterThanOrEqual(0)
        expect(pred.homeScore).toBeLessThanOrEqual(4)
        expect(pred.awayScore).toBeGreaterThanOrEqual(0)
        expect(pred.awayScore).toBeLessThanOrEqual(4)
      }
    }
  })

  it('generates 32 knockout picks per player, each picking one of the two teams', () => {
    for (const player of players) {
      expect(player.knockoutPicks).toHaveLength(32)
      for (const kPick of player.knockoutPicks) {
        const result = knockoutResults.find((r) => r.matchId === kPick.matchId)!
        expect([result.homeTeamId, result.awayTeamId]).toContain(kPick.pickedTeam)
      }
    }
  })

  it('generates a champion pick per player from the 48 teams', () => {
    const allTeamIds = teams.map((t) => t.id)
    for (const player of players) {
      expect(allTeamIds).toContain(player.championPick)
    }
  })

  it('naive and production scoring agree for every player', () => {
    for (const player of players) {
      const naive = naiveTotalScore(player, groupResults, knockoutResults)
      const production = productionTotalScore(player, groupResults, knockoutResults)

      expect(production.groupTotal).toBe(naive.groupTotal)
      expect(production.knockoutTotal).toBe(naive.knockoutTotal)
      expect(production.championBonusAwarded).toBe(naive.championBonusAwarded)
      expect(production.total).toBe(naive.total)
    }
  })

  it('champion bonus is 10 when pick matches final winner, 0 otherwise', () => {
    const finalResult = knockoutResults.find((r) => r.matchId === 104)!
    for (const player of players) {
      const naive = naiveTotalScore(player, groupResults, knockoutResults)
      if (player.championPick === finalResult.winnerId) {
        expect(naive.championBonusAwarded).toBe(10)
      } else {
        expect(naive.championBonusAwarded).toBe(0)
      }
    }
  })

  it('every player total is within [0, 496]', () => {
    for (const player of players) {
      const naive = naiveTotalScore(player, groupResults, knockoutResults)
      expect(naive.total).toBeGreaterThanOrEqual(0)
      expect(naive.total).toBeLessThanOrEqual(THEORETICAL_MAX)
    }
  })

  it('CHAMPION_BONUS constant equals 10', () => {
    expect(CHAMPION_BONUS).toBe(10)
  })

  it('CHAMPION_BONUS_MATCH_ID constant equals 0', () => {
    expect(CHAMPION_BONUS_MATCH_ID).toBe(0)
  })

  it('verifies knockout point values per round match the naive implementation', () => {
    // R32
    for (let id = 73; id <= 88; id++) {
      expect(getKnockoutPointsForMatch(id)).toBe(3)
      expect(naiveKnockoutPointsForMatch(id)).toBe(3)
    }
    // R16
    for (let id = 89; id <= 96; id++) {
      expect(getKnockoutPointsForMatch(id)).toBe(4)
      expect(naiveKnockoutPointsForMatch(id)).toBe(4)
    }
    // QF
    for (let id = 97; id <= 100; id++) {
      expect(getKnockoutPointsForMatch(id)).toBe(5)
      expect(naiveKnockoutPointsForMatch(id)).toBe(5)
    }
    // SF
    for (let id = 101; id <= 102; id++) {
      expect(getKnockoutPointsForMatch(id)).toBe(6)
      expect(naiveKnockoutPointsForMatch(id)).toBe(6)
    }
    // Third place
    expect(getKnockoutPointsForMatch(103)).toBe(6)
    expect(naiveKnockoutPointsForMatch(103)).toBe(6)
    // Final
    expect(getKnockoutPointsForMatch(104)).toBe(8)
    expect(naiveKnockoutPointsForMatch(104)).toBe(8)
  })

  it('is reproducible — same seed yields same scores', () => {
    const rng2 = mulberry32(SEED)
    const groupResults2 = generateGroupResults(rng2)
    const knockoutResults2 = generateKnockoutResults(rng2)
    const players2 = generatePlayers(N_PLAYERS, rng2, knockoutResults2)

    for (let i = 0; i < N_PLAYERS; i++) {
      const score1 = naiveTotalScore(players[i], groupResults, knockoutResults)
      const score2 = naiveTotalScore(players2[i], groupResults2, knockoutResults2)
      expect(score2.total).toBe(score1.total)
      expect(score2.groupTotal).toBe(score1.groupTotal)
      expect(score2.knockoutTotal).toBe(score1.knockoutTotal)
      expect(score2.championBonusAwarded).toBe(score1.championBonusAwarded)
    }
  })

  describe('theoretical maximum score', () => {
    it('a perfect player scores exactly 496', () => {
      // Build a perfect player who predicts every group match exactly
      const perfectGroupPreds: GroupPrediction[] = groupResults.map((r) => ({
        matchId: r.matchId,
        homeScore: r.homeScore,
        awayScore: r.awayScore,
      }))

      // Build perfect knockout picks — always pick the winner
      const perfectKnockoutPicks: KnockoutPick[] = knockoutResults.map((r) => ({
        matchId: r.matchId,
        pickedTeam: r.winnerId,
      }))

      // Champion pick = final winner
      const finalResult = knockoutResults.find((r) => r.matchId === 104)!
      const championPick = finalResult.winnerId

      const perfectPlayer: PlayerData = {
        id: 'perfect',
        groupPredictions: perfectGroupPreds,
        knockoutPicks: perfectKnockoutPicks,
        championPick,
      }

      const naive = naiveTotalScore(perfectPlayer, groupResults, knockoutResults)
      const production = productionTotalScore(perfectPlayer, groupResults, knockoutResults)

      // Group: 72 * 5 = 360
      expect(naive.groupTotal).toBe(360)
      // R32: 16 * 3 = 48, R16: 8 * 4 = 32, QF: 4 * 5 = 20, SF: 2 * 6 = 12, 3rd: 6, Final: 8
      expect(naive.knockoutTotal).toBe(48 + 32 + 20 + 12 + 6 + 8)
      expect(naive.championBonusAwarded).toBe(10)
      expect(naive.total).toBe(THEORETICAL_MAX)

      // Production must agree
      expect(production.total).toBe(THEORETICAL_MAX)
      expect(production.total).toBe(naive.total)
    })

    it('theoretical max equals 496', () => {
      const groupMax = 72 * 5
      const r32Max = 16 * 3
      const r16Max = 8 * 4
      const qfMax = 4 * 5
      const sfMax = 2 * 6
      const thirdPlaceMax = 1 * 6
      const finalMax = 1 * 8
      const championMax = 10

      const computed = groupMax + r32Max + r16Max + qfMax + sfMax + thirdPlaceMax + finalMax + championMax
      expect(computed).toBe(496)
      expect(computed).toBe(THEORETICAL_MAX)
    })
  })

  describe('PREDICTION_ROUND_RANGES coverage', () => {
    it('group range covers 1-72', () => {
      expect(PREDICTION_ROUND_RANGES.group).toEqual([1, 72])
    })

    it('knockout ranges cover 73-104', () => {
      expect(PREDICTION_ROUND_RANGES.r32).toEqual([73, 88])
      expect(PREDICTION_ROUND_RANGES.r16).toEqual([89, 96])
      expect(PREDICTION_ROUND_RANGES.qf).toEqual([97, 100])
      expect(PREDICTION_ROUND_RANGES.sf).toEqual([101, 102])
      expect(PREDICTION_ROUND_RANGES.final).toEqual([103, 104])
    })
  })

  describe('data integrity checks', () => {
    it('groupFixtures has 72 matches', () => {
      expect(groupFixtures).toHaveLength(72)
    })

    it('bracketTemplate has 32 knockout matches', () => {
      expect(bracketTemplate).toHaveLength(32)
    })

    it('teams has 48 entries', () => {
      expect(teams).toHaveLength(48)
    })

    it('groups has 12 groups of 4 teams each', () => {
      const groupIds = Object.keys(groups)
      expect(groupIds).toHaveLength(12)
      for (const gid of groupIds) {
        expect(groups[gid as keyof typeof groups]).toHaveLength(4)
      }
    })
  })
})
