import { CHAMPION_BONUS_MATCH_ID } from '../constants'
import type { RoundKey } from './rounds'
import { getAllRounds } from './rounds'

export interface LeaderboardEntry {
  playerId: string
  displayName: string
  isHost: boolean
  totalPoints: number
  exactScores: number
  correctResults: number
  matchesScored: number
  championBonus: number
  rank: number
}

export type Movement = { direction: 'up' | 'down' | 'same' | 'new'; delta: number }

/**
 * Compute a ranked leaderboard from players + score rows.
 * Pure function — no DB access.
 */
export function computeLeaderboard(
  players: Array<{ id: string; display_name: string; is_host: boolean }>,
  scores: Array<{ player_id: string; points: number; match_id: number }>,
): LeaderboardEntry[] {
  const playerScores = new Map<string, { total: number; exact: number; correct: number; matches: number; championBonus: number }>()

  for (const p of players) {
    playerScores.set(p.id, { total: 0, exact: 0, correct: 0, matches: 0, championBonus: 0 })
  }

  for (const s of scores) {
    const current = playerScores.get(s.player_id)
    if (current) {
      current.total += s.points
      if (s.match_id === CHAMPION_BONUS_MATCH_ID) {
        current.championBonus = s.points
      } else {
        current.matches++
        if (s.points === 5) current.exact++
        if (s.points > 0) current.correct++
      }
    }
  }

  const sorted = players
    .map((p) => {
      const stats = playerScores.get(p.id) ?? { total: 0, exact: 0, correct: 0, matches: 0, championBonus: 0 }
      return {
        playerId: p.id,
        displayName: p.display_name,
        isHost: p.is_host,
        totalPoints: stats.total,
        exactScores: stats.exact,
        correctResults: stats.correct,
        matchesScored: stats.matches,
        championBonus: stats.championBonus,
        rank: 0,
      }
    })
    .sort((a, b) =>
      b.totalPoints - a.totalPoints
      || b.exactScores - a.exactScores
      || b.correctResults - a.correctResults
    )

  // Assign shared ranks: tied players get the same rank number
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      sorted[i].rank = 1
    } else {
      const prev = sorted[i - 1]
      if (
        sorted[i].totalPoints === prev.totalPoints &&
        sorted[i].exactScores === prev.exactScores &&
        sorted[i].correctResults === prev.correctResults
      ) {
        sorted[i].rank = prev.rank
      } else {
        sorted[i].rank = i + 1
      }
    }
  }

  return sorted
}

/**
 * Compute movement for each player by comparing current leaderboard
 * against a previous snapshot.
 */
export function computeMovement(
  leaderboard: LeaderboardEntry[],
  previousSnapshot: Array<{ player_id: string; rank: number }> | null,
): Map<string, Movement> {
  const result = new Map<string, Movement>()

  if (!previousSnapshot || previousSnapshot.length === 0) {
    // First batch — everyone is 'new'
    for (const entry of leaderboard) {
      result.set(entry.playerId, { direction: 'new', delta: 0 })
    }
    return result
  }

  const prevRankMap = new Map(previousSnapshot.map((s) => [s.player_id, s.rank]))

  for (const entry of leaderboard) {
    const prevRank = prevRankMap.get(entry.playerId)
    if (prevRank === undefined) {
      result.set(entry.playerId, { direction: 'new', delta: 0 })
    } else if (entry.rank < prevRank) {
      result.set(entry.playerId, { direction: 'up', delta: prevRank - entry.rank })
    } else if (entry.rank > prevRank) {
      result.set(entry.playerId, { direction: 'down', delta: entry.rank - prevRank })
    } else {
      result.set(entry.playerId, { direction: 'same', delta: 0 })
    }
  }

  return result
}

/**
 * Get the batch that comes before the given batch in round order.
 */
export function getPreviousBatch(batch: RoundKey): RoundKey | null {
  const allRounds = getAllRounds()
  const idx = allRounds.indexOf(batch)
  if (idx <= 0) return null
  return allRounds[idx - 1]
}
