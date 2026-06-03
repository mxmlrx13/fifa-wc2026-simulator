/**
 * Tiered scoring for multiplayer predictions.
 *
 * | Accuracy                              | Points |
 * |---------------------------------------|--------|
 * | Exact score                           | 5      |
 * | Correct result + correct goal diff    | 3      |
 * | Correct result only (W/D/L)           | 1      |
 * | Wrong                                 | 0      |
 */
export function computePoints(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
): { points: number; reason: string } {
  // Exact score
  if (predHome === actualHome && predAway === actualAway) {
    return { points: 5, reason: 'exact' }
  }

  const predResult = Math.sign(predHome - predAway)
  const actualResult = Math.sign(actualHome - actualAway)

  if (predResult !== actualResult) {
    return { points: 0, reason: 'wrong' }
  }

  // Correct result — check goal difference
  const predDiff = predHome - predAway
  const actualDiff = actualHome - actualAway

  if (predDiff === actualDiff) {
    return { points: 3, reason: 'result_gd' }
  }

  return { points: 1, reason: 'result' }
}
