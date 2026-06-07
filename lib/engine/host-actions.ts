import {
  PREDICTION_ROUNDS,
  PREDICTION_ROUND_LABELS,
  type PredictionRoundKey,
} from '@/lib/constants'

interface GameRound {
  roundKey: PredictionRoundKey
  status: 'pending' | 'open' | 'locked' | 'scored'
}

type HostAction =
  | { type: 'lock_round'; roundKey: PredictionRoundKey; label: string }
  | { type: 'enter_results'; batch: string; label: string }
  | { type: 'open_round'; roundKey: PredictionRoundKey; label: string }
  | { type: 'finished'; label: string }

export type { GameRound, HostAction }

/**
 * Pure function that determines the single next action the host should take,
 * given the current state of all prediction rounds.
 *
 * Priority:
 *  1. Lock an open round
 *  2. Enter results for a locked round
 *  3. Open the next pending round whose predecessor is scored
 *  4. Tournament complete
 */
export function getHostNextAction(rounds: GameRound[]): HostAction {
  // Build a lookup by roundKey for quick access
  const byKey = new Map(rounds.map((r) => [r.roundKey, r]))

  // 1. If any round is open → lock it
  for (const key of PREDICTION_ROUNDS) {
    const round = byKey.get(key)
    if (round?.status === 'open') {
      return {
        type: 'lock_round',
        roundKey: key,
        label: `Lock ${PREDICTION_ROUND_LABELS[key]} predictions`,
      }
    }
  }

  // 2. If any round is locked → enter results
  for (const key of PREDICTION_ROUNDS) {
    const round = byKey.get(key)
    if (round?.status === 'locked') {
      return {
        type: 'enter_results',
        batch: key,
        label: `Enter ${PREDICTION_ROUND_LABELS[key]} results`,
      }
    }
  }

  // 3. All rounds are scored or pending — find the next pending round
  //    whose predecessor is scored (or which is the first round).
  for (let i = 0; i < PREDICTION_ROUNDS.length; i++) {
    const key = PREDICTION_ROUNDS[i]
    const round = byKey.get(key)
    if (round?.status !== 'pending') continue

    const predecessorScored =
      i === 0 || byKey.get(PREDICTION_ROUNDS[i - 1])?.status === 'scored'

    if (predecessorScored) {
      return {
        type: 'open_round',
        roundKey: key,
        label: `Open ${PREDICTION_ROUND_LABELS[key]} predictions`,
      }
    }
  }

  // 4. All rounds scored
  return { type: 'finished', label: 'Tournament complete' }
}
