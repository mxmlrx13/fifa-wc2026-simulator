import { describe, it, expect } from 'vitest'
import { computePoints } from '../scoring'

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
