import { describe, it, expect } from 'vitest'

/**
 * The leaderboard ranking logic is in the API route. We extract and test
 * the sorting + shared-rank algorithm here as a pure function.
 */

interface RawEntry {
  playerId: string
  totalPoints: number
  exactScores: number
  correctResults: number
}

function rankLeaderboard(entries: RawEntry[]): (RawEntry & { rank: number })[] {
  const sorted = [...entries].sort((a, b) =>
    b.totalPoints - a.totalPoints
    || b.exactScores - a.exactScores
    || b.correctResults - a.correctResults
  )

  const ranked: (RawEntry & { rank: number })[] = []
  for (let i = 0; i < sorted.length; i++) {
    let rank = 1
    if (i > 0) {
      const prev = sorted[i - 1]
      const prevRank = ranked[i - 1].rank
      if (
        sorted[i].totalPoints === prev.totalPoints &&
        sorted[i].exactScores === prev.exactScores &&
        sorted[i].correctResults === prev.correctResults
      ) {
        rank = prevRank
      } else {
        rank = i + 1
      }
    }
    ranked.push({ ...sorted[i], rank })
  }
  return ranked
}

describe('leaderboard tiebreaker ordering', () => {
  it('sorts by total points descending', () => {
    const result = rankLeaderboard([
      { playerId: 'a', totalPoints: 10, exactScores: 0, correctResults: 5 },
      { playerId: 'b', totalPoints: 20, exactScores: 0, correctResults: 5 },
    ])
    expect(result[0].playerId).toBe('b')
    expect(result[1].playerId).toBe('a')
    expect(result[0].rank).toBe(1)
    expect(result[1].rank).toBe(2)
  })

  it('breaks tie by exact scores (5-pt predictions)', () => {
    const result = rankLeaderboard([
      { playerId: 'a', totalPoints: 20, exactScores: 1, correctResults: 5 },
      { playerId: 'b', totalPoints: 20, exactScores: 3, correctResults: 5 },
    ])
    expect(result[0].playerId).toBe('b')
    expect(result[1].playerId).toBe('a')
  })

  it('breaks tie by correct results count as tertiary', () => {
    const result = rankLeaderboard([
      { playerId: 'a', totalPoints: 20, exactScores: 2, correctResults: 8 },
      { playerId: 'b', totalPoints: 20, exactScores: 2, correctResults: 12 },
    ])
    expect(result[0].playerId).toBe('b')
    expect(result[1].playerId).toBe('a')
  })

  it('assigns shared rank when all tiebreakers are equal', () => {
    const result = rankLeaderboard([
      { playerId: 'a', totalPoints: 15, exactScores: 1, correctResults: 6 },
      { playerId: 'b', totalPoints: 20, exactScores: 2, correctResults: 8 },
      { playerId: 'c', totalPoints: 15, exactScores: 1, correctResults: 6 },
    ])
    expect(result[0].rank).toBe(1)
    expect(result[0].playerId).toBe('b')
    // a and c are tied — both get rank 2
    expect(result[1].rank).toBe(2)
    expect(result[2].rank).toBe(2)
  })

  it('skips rank after shared rank (1, 2, 2, 4)', () => {
    const result = rankLeaderboard([
      { playerId: 'a', totalPoints: 30, exactScores: 3, correctResults: 10 },
      { playerId: 'b', totalPoints: 20, exactScores: 2, correctResults: 8 },
      { playerId: 'c', totalPoints: 20, exactScores: 2, correctResults: 8 },
      { playerId: 'd', totalPoints: 10, exactScores: 0, correctResults: 4 },
    ])
    expect(result.map((r) => r.rank)).toEqual([1, 2, 2, 4])
  })
})
