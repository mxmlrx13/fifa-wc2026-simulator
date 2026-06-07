import { describe, it, expect } from 'vitest'
import { computePoints } from '../scoring'
import {
  getKnockoutPointsForMatch,
  KNOCKOUT_EXACT_BONUS,
  THIRD_PLACE_MATCH_ID,
  FINAL_MATCH_ID,
} from '@/lib/constants'

describe('computePoints', () => {
  it('awards 5 points for exact score', () => {
    expect(computePoints(2, 1, 2, 1)).toEqual({ points: 5, reason: 'exact' })
    expect(computePoints(0, 0, 0, 0)).toEqual({ points: 5, reason: 'exact' })
  })

  it('awards 3 points for correct result + goal difference', () => {
    // Predicted 3-1 (+2), actual 2-0 (+2) — same result (home win) + same GD
    expect(computePoints(3, 1, 2, 0)).toEqual({ points: 3, reason: 'result_gd' })
    // Draw with same GD
    expect(computePoints(1, 1, 2, 2)).toEqual({ points: 3, reason: 'result_gd' })
  })

  it('awards 1 point for correct result only', () => {
    // Both home wins, different GD
    expect(computePoints(1, 0, 3, 0)).toEqual({ points: 1, reason: 'result' })
    // Both away wins, different GD (pred: -2, actual: -1)
    expect(computePoints(0, 2, 1, 2)).toEqual({ points: 1, reason: 'result' })
  })

  it('awards 0 points for wrong result', () => {
    // Predicted home win, actual draw
    expect(computePoints(2, 0, 1, 1)).toEqual({ points: 0, reason: 'wrong' })
    // Predicted draw, actual away win
    expect(computePoints(1, 1, 0, 2)).toEqual({ points: 0, reason: 'wrong' })
    // Predicted away win, actual home win
    expect(computePoints(0, 1, 2, 0)).toEqual({ points: 0, reason: 'wrong' })
  })
})

describe('knockout scoring (score-based predictions)', () => {
  // Helper: simulate knockout scoring as done in the results route
  function computeKnockoutPoints(
    matchId: number,
    predHome: number, predAway: number, predWinner: string,
    actualHome: number, actualAway: number, actualWinner: string,
  ): number {
    const correctWinner = predWinner === actualWinner
    if (!correctWinner) return 0
    let points = getKnockoutPointsForMatch(matchId)
    if (predHome === actualHome && predAway === actualAway) {
      points += KNOCKOUT_EXACT_BONUS
    }
    return points
  }

  it('awards base points for correct winner only (R32)', () => {
    // Predicted 2-1 (home wins), actual 3-0 (home wins) — correct winner, wrong score
    expect(computeKnockoutPoints(73, 2, 1, 'BRA', 3, 0, 'BRA')).toBe(3)
  })

  it('awards base + exact bonus for correct winner + exact score (R32)', () => {
    // Predicted 2-1, actual 2-1 — exact match
    expect(computeKnockoutPoints(73, 2, 1, 'BRA', 2, 1, 'BRA')).toBe(3 + KNOCKOUT_EXACT_BONUS)
  })

  it('awards 0 for wrong winner', () => {
    // Predicted 2-1 home wins, actual 0-2 away wins
    expect(computeKnockoutPoints(73, 2, 1, 'BRA', 0, 2, 'ARG')).toBe(0)
  })

  it('awards 0 when exact score but wrong winner (impossible in non-tie, valid in tie)', () => {
    // Predicted 1-1 with BRA winning shootout, actual 1-1 with ARG winning shootout
    expect(computeKnockoutPoints(73, 1, 1, 'BRA', 1, 1, 'ARG')).toBe(0)
  })

  it('awards base + bonus for correct shootout call + exact tied score', () => {
    // Both predict 1-1 tie, both pick BRA as shootout winner
    expect(computeKnockoutPoints(73, 1, 1, 'BRA', 1, 1, 'BRA')).toBe(3 + KNOCKOUT_EXACT_BONUS)
  })

  it('awards base only for correct shootout call but different tied score', () => {
    // Predicted 2-2 BRA wins shootout, actual 1-1 BRA wins shootout
    expect(computeKnockoutPoints(73, 2, 2, 'BRA', 1, 1, 'BRA')).toBe(3)
  })

  it('escalates points per round', () => {
    // R32 = 3, R16 = 4, QF = 5, SF = 6, 3rd = 6, Final = 8
    expect(getKnockoutPointsForMatch(73)).toBe(3)   // R32
    expect(getKnockoutPointsForMatch(89)).toBe(4)   // R16
    expect(getKnockoutPointsForMatch(97)).toBe(5)   // QF
    expect(getKnockoutPointsForMatch(101)).toBe(6)  // SF
    expect(getKnockoutPointsForMatch(THIRD_PLACE_MATCH_ID)).toBe(6)
    expect(getKnockoutPointsForMatch(FINAL_MATCH_ID)).toBe(8)
  })

  it('awards Final base + bonus for exact final score', () => {
    expect(computeKnockoutPoints(FINAL_MATCH_ID, 2, 1, 'BRA', 2, 1, 'BRA')).toBe(8 + KNOCKOUT_EXACT_BONUS)
  })
})
