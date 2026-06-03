import { createInitialState } from '@/lib/store'
import type { TournamentState } from '@/lib/types'

interface PredictionRow {
  match_id: number
  home_score: number | null
  away_score: number | null
  winner_id: string | null
}

/**
 * Converts saved prediction rows from the API into a TournamentState
 * that can be fed to PredictionProvider as initialState.
 */
export function hydratePredictions(predictions: PredictionRow[]): TournamentState {
  const base = createInitialState()

  const scoreMap = new Map<number, { homeScore: number; awayScore: number }>()
  const knockoutPicks: Record<number, string> = {}

  for (const p of predictions) {
    if (p.home_score !== null && p.away_score !== null) {
      scoreMap.set(p.match_id, { homeScore: p.home_score, awayScore: p.away_score })
    }
    if (p.winner_id) {
      knockoutPicks[p.match_id] = p.winner_id
    }
  }

  const groupMatches = base.groupMatches.map((m) => {
    const saved = scoreMap.get(m.id)
    if (saved) {
      return { ...m, homeScore: saved.homeScore, awayScore: saved.awayScore }
    }
    return m
  })

  return {
    ...base,
    groupMatches,
    knockoutPicks,
  }
}
