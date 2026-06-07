import { teamsMap } from '@/lib/data/teams'
import type { GroupMatch } from '@/lib/types'

/**
 * Generate a plausible score for a group match based on FIFA ranking gap.
 * Higher-ranked team (lower number) gets a slight edge.
 * Returns [homeScore, awayScore] — always integers 0-4.
 */
export function generateGroupScore(
  homeTeamId: string,
  awayTeamId: string,
  seed: number,
): [number, number] {
  const homeRank = teamsMap[homeTeamId]?.fifaRanking ?? 50
  const awayRank = teamsMap[awayTeamId]?.fifaRanking ?? 50

  // Ranking gap: positive means home team is stronger (lower rank = better)
  const gap = awayRank - homeRank

  // Pseudo-random using seed — deterministic for same match
  const r1 = seededRandom(seed)
  const r2 = seededRandom(seed + 7919)

  // Base goals: 0-2 for each team
  let homeGoals = Math.floor(r1 * 3)
  let awayGoals = Math.floor(r2 * 3)

  // Apply ranking bias: if gap > 20, stronger team gets +1
  if (gap > 20) homeGoals = Math.min(homeGoals + 1, 4)
  else if (gap < -20) awayGoals = Math.min(awayGoals + 1, 4)

  // If gap > 50, even more advantage
  if (gap > 50) homeGoals = Math.min(homeGoals + 1, 4)
  else if (gap < -50) awayGoals = Math.min(awayGoals + 1, 4)

  return [homeGoals, awayGoals]
}

/**
 * Quick-fill all unfilled group matches with ranking-based plausible scores.
 * Returns a new array with filled scores. Never overwrites existing predictions.
 * Also returns the set of match IDs that were quick-filled.
 */
export function quickFillGroupMatches(
  matches: GroupMatch[],
): { filled: GroupMatch[]; filledIds: Set<number> } {
  const filledIds = new Set<number>()

  const filled = matches.map((m) => {
    if (m.homeScore !== null && m.awayScore !== null) return m

    const [homeScore, awayScore] = generateGroupScore(
      m.homeTeamId,
      m.awayTeamId,
      m.id,
    )
    filledIds.add(m.id)
    return { ...m, homeScore, awayScore }
  })

  return { filled, filledIds }
}

export interface KnockoutPrediction {
  homeScore: number | null
  awayScore: number | null
  winnerId: string
}

/**
 * Generate score-based knockout predictions for unfilled fixtures.
 * Uses ranking-based scoring (same model as groups) and re-rolls ties
 * so the winner is always deterministic from the score.
 */
export function quickFillKnockoutPicks(
  fixtures: Array<{
    matchId: number
    homeTeamId: string | null
    awayTeamId: string | null
  }>,
  existingPicks: Record<number, KnockoutPrediction | string>,
): Record<number, KnockoutPrediction> {
  const newPicks: Record<number, KnockoutPrediction> = {}

  for (const f of fixtures) {
    if (existingPicks[f.matchId]) continue
    if (!f.homeTeamId || !f.awayTeamId) continue

    const homeRank = teamsMap[f.homeTeamId]?.fifaRanking ?? 50
    const awayRank = teamsMap[f.awayTeamId]?.fifaRanking ?? 50

    // Generate a non-tied score
    let seed = f.matchId
    let homeScore: number, awayScore: number
    do {
      ;[homeScore, awayScore] = generateGroupScore(f.homeTeamId, f.awayTeamId, seed)
      seed += 1000
    } while (homeScore === awayScore)

    // Winner is the higher scorer
    const winnerId = homeScore > awayScore ? f.homeTeamId : f.awayTeamId

    newPicks[f.matchId] = { homeScore, awayScore, winnerId }
  }

  return newPicks
}

/** Simple seeded PRNG (mulberry32). */
function seededRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
