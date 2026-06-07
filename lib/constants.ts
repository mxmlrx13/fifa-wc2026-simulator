/** Maximum match ID for group stage matches (1–72). */
export const GROUP_MATCH_MAX_ID = 72

/** Total number of matches in the tournament (groups + knockout). */
export const TOTAL_MATCHES = 104

/** Length of the randomly generated game code. */
export const GAME_CODE_LENGTH = 6

/** Maximum retries when generating a unique game code. */
export const CODE_GENERATION_RETRIES = 5

/** Number of third-place teams that qualify for the knockout round. */
export const QUALIFIED_THIRD_PLACE_COUNT = 8

/** Match ID for the third-place match. */
export const THIRD_PLACE_MATCH_ID = 103

/** Match ID for the final. */
export const FINAL_MATCH_ID = 104

// ---------------------------------------------------------------------------
// Prediction rounds — the rounds in which players make predictions.
// Distinct from result batches (group_md1/md2/md3 are result-entry batches
// within the 'group' prediction round).
// ---------------------------------------------------------------------------

export type PredictionRoundKey = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'

export const PREDICTION_ROUNDS: PredictionRoundKey[] = [
  'group',
  'r32',
  'r16',
  'qf',
  'sf',
  'final',
]

/** Maps prediction round key → [minMatchId, maxMatchId]. */
export const PREDICTION_ROUND_RANGES: Record<PredictionRoundKey, [number, number]> = {
  group: [1, 72],
  r32: [73, 88],
  r16: [89, 96],
  qf: [97, 100],
  sf: [101, 102],
  final: [103, 104],
}

export const PREDICTION_ROUND_LABELS: Record<PredictionRoundKey, string> = {
  group: 'Group Stage',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-finals',
  sf: 'Semi-finals',
  final: 'Final',
}

/** Returns the prediction round key for a given match ID, or null. */
export function getPredictionRoundForMatchId(matchId: number): PredictionRoundKey | null {
  for (const round of PREDICTION_ROUNDS) {
    const [min, max] = PREDICTION_ROUND_RANGES[round]
    if (matchId >= min && matchId <= max) return round
  }
  return null
}

/** Returns all match IDs in a prediction round. */
export function getMatchIdsForPredictionRound(round: PredictionRoundKey): number[] {
  const [min, max] = PREDICTION_ROUND_RANGES[round]
  const ids: number[] = []
  for (let i = min; i <= max; i++) ids.push(i)
  return ids
}

// ---------------------------------------------------------------------------
// Knockout scoring — escalating points per round.
// ---------------------------------------------------------------------------

/** Base points per knockout round for a correct winner pick. */
export const KNOCKOUT_POINTS: Record<string, number> = {
  r32: 3,
  r16: 4,
  qf: 5,
  sf: 6,
}

/** Per-match point overrides (takes priority over round-level KNOCKOUT_POINTS). */
export const MATCH_POINT_OVERRIDES: Record<number, number> = {
  [THIRD_PLACE_MATCH_ID]: 6,
  [FINAL_MATCH_ID]: 8,
}

/** Returns the points value for a correct knockout winner pick. */
export function getKnockoutPointsForMatch(matchId: number): number {
  if (matchId in MATCH_POINT_OVERRIDES) return MATCH_POINT_OVERRIDES[matchId]
  const round = getPredictionRoundForMatchId(matchId)
  if (round && round in KNOCKOUT_POINTS) return KNOCKOUT_POINTS[round]
  return 3 // fallback
}

/** Bonus points for correctly predicting the tournament champion. */
export const CHAMPION_BONUS = 10

/** Sentinel match_id used in the scores table for the champion bonus row. */
export const CHAMPION_BONUS_MATCH_ID = 0
