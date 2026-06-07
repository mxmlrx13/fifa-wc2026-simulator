import { describe, it, expect } from 'vitest'
import { getMatchIdsForRound, getAllRounds, type RoundKey } from '../rounds'

/**
 * Tests for the validation logic used in the results API route.
 * We test the pure-function building blocks here; the API route
 * applies them to reject invalid inputs.
 */

describe('results batch validation', () => {
  it('getMatchIdsForRound returns empty for an invalid round key', () => {
    // Cast to bypass TypeScript — simulates untrusted client input
    const ids = getMatchIdsForRound('invalid_round' as RoundKey)
    expect(ids).toEqual([])
  })

  it('getAllRounds does not include invalid keys', () => {
    const rounds = getAllRounds()
    expect(rounds).not.toContain('invalid_round')
    expect(rounds).toContain('group_md1')
    expect(rounds).toContain('final')
  })
})

describe('knockout draw-without-winner detection', () => {
  /**
   * Simulates the validation logic from the results API route:
   * for a knockout batch, any result where homeScore === awayScore
   * and winnerId is missing should be flagged.
   */
  function findTiedWithoutWinner(
    results: Array<{ matchId: number; homeScore: number; awayScore: number; winnerId?: string }>,
    validMatchIds: Set<number>,
  ): number[] {
    return results
      .filter((r) => validMatchIds.has(r.matchId))
      .filter((r) => r.homeScore === r.awayScore && !r.winnerId)
      .map((r) => r.matchId)
  }

  it('returns empty when no matches are tied', () => {
    const validIds = new Set([73, 74, 75])
    const results = [
      { matchId: 73, homeScore: 2, awayScore: 1 },
      { matchId: 74, homeScore: 0, awayScore: 3 },
    ]
    expect(findTiedWithoutWinner(results, validIds)).toEqual([])
  })

  it('returns empty when tied match has a winnerId', () => {
    const validIds = new Set([73])
    const results = [
      { matchId: 73, homeScore: 1, awayScore: 1, winnerId: 'BRA' },
    ]
    expect(findTiedWithoutWinner(results, validIds)).toEqual([])
  })

  it('returns offending match IDs when tied without winner', () => {
    const validIds = new Set([73, 74, 75])
    const results = [
      { matchId: 73, homeScore: 1, awayScore: 1 },
      { matchId: 74, homeScore: 2, awayScore: 0 },
      { matchId: 75, homeScore: 0, awayScore: 0 },
    ]
    expect(findTiedWithoutWinner(results, validIds)).toEqual([73, 75])
  })

  it('ignores matches outside the valid batch', () => {
    const validIds = new Set([73])
    const results = [
      { matchId: 73, homeScore: 2, awayScore: 0 },
      { matchId: 99, homeScore: 1, awayScore: 1 }, // outside batch
    ]
    expect(findTiedWithoutWinner(results, validIds)).toEqual([])
  })
})
