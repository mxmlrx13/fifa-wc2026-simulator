'use client'

import { useReducer, useMemo, useEffect, type ReactNode } from 'react'
import {
  TournamentContext,
  createInitialState,
  tournamentReducer,
  type TournamentContextValue,
} from '@/lib/store'
import type { TournamentState } from '@/lib/types'
import { computeTournament } from '@/lib/engine/tournament'

interface PredictionProviderProps {
  children: ReactNode
  initialState?: TournamentState
  onStateChange?: (state: TournamentState) => void
}

export default function PredictionProvider({
  children,
  initialState,
  onStateChange,
}: PredictionProviderProps) {
  const [state, dispatch] = useReducer(
    tournamentReducer,
    initialState ?? createInitialState(),
  )

  useEffect(() => {
    onStateChange?.(state)
  }, [state, onStateChange])

  const computed = useMemo(() => computeTournament(state), [state])

  const value = useMemo<TournamentContextValue>(
    () => ({
      state,
      dispatch,
      groupStandings: computed.groupStandings,
      thirdPlaceResults: computed.thirdPlaceResults,
      knockoutMatches: computed.knockoutMatches,
      allGroupsComplete: computed.allGroupsComplete,
      champion: computed.champion,
    }),
    [state, dispatch, computed],
  )

  return (
    <TournamentContext value={value}>
      {children}
    </TournamentContext>
  )
}
