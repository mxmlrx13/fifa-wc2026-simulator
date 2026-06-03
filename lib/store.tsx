'use client'

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  GroupId,
  GroupMatch,
  GroupStanding,
  KnockoutMatch,
  ThirdPlaceResult,
  TournamentState,
} from './types'
import { groupFixtures } from './data/fixtures'
import { bracketTemplate } from './data/bracket-template'
import { computeTournament } from './engine/tournament'

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type TournamentAction =
  | { type: 'SET_MATCH_SCORE'; matchId: number; homeScore: number; awayScore: number }
  | { type: 'SET_KNOCKOUT_WINNER'; matchId: number; winnerId: string }
  | { type: 'RESET_GROUP'; groupId: GroupId }
  | { type: 'RESET_KNOCKOUT' }
  | { type: 'RESET_ALL' }
  | { type: 'HYDRATE'; state: TournamentState }

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

function createInitialState(): TournamentState {
  return {
    groupMatches: groupFixtures.map((m) => ({ ...m })),
    knockoutMatches: bracketTemplate.map((m) => ({ ...m })),
    knockoutPicks: {},
  }
}

const initialState: TournamentState = createInitialState()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'fifa-wc2026-simulator-state'

/**
 * Extract the set of qualifying team IDs (top 2 per group + best third-place)
 * from a tournament state. Used to detect when group score changes invalidate
 * the knockout bracket.
 */
function getQualifyingTeamIds(state: TournamentState): Set<string> {
  const { groupStandings, thirdPlaceResults } = computeTournament(state)
  const ids = new Set<string>()

  for (const groupId of Object.keys(groupStandings) as GroupId[]) {
    const standings = groupStandings[groupId]
    for (const s of standings) {
      if (s.qualification === 'winner' || s.qualification === 'runner-up') {
        ids.add(s.teamId)
      }
    }
  }

  for (const t of thirdPlaceResults) {
    if (t.qualified) {
      ids.add(t.teamId)
    }
  }

  return ids
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) {
    if (!b.has(v)) return false
  }
  return true
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function tournamentReducer(
  state: TournamentState,
  action: TournamentAction
): TournamentState {
  switch (action.type) {
    case 'SET_MATCH_SCORE': {
      const prevQualifiers = Object.keys(state.knockoutPicks).length > 0
        ? getQualifyingTeamIds(state)
        : null

      const groupMatches = state.groupMatches.map((m) =>
        m.id === action.matchId
          ? { ...m, homeScore: action.homeScore, awayScore: action.awayScore }
          : m
      )

      const nextState: TournamentState = { ...state, groupMatches }

      // Check if qualifying teams changed - if so, clear knockout picks
      if (prevQualifiers !== null) {
        const nextQualifiers = getQualifyingTeamIds(nextState)
        if (!setsEqual(prevQualifiers, nextQualifiers)) {
          return { ...nextState, knockoutPicks: {} }
        }
      }

      return nextState
    }

    case 'SET_KNOCKOUT_WINNER': {
      return {
        ...state,
        knockoutPicks: {
          ...state.knockoutPicks,
          [action.matchId]: action.winnerId,
        },
      }
    }

    case 'RESET_GROUP': {
      const prevQualifiers = Object.keys(state.knockoutPicks).length > 0
        ? getQualifyingTeamIds(state)
        : null

      const groupMatches = state.groupMatches.map((m) =>
        m.groupId === action.groupId
          ? { ...m, homeScore: null, awayScore: null }
          : m
      )

      const nextState: TournamentState = {
        ...state,
        groupMatches,
        knockoutPicks: {},
      }

      return nextState
    }

    case 'RESET_KNOCKOUT': {
      return { ...state, knockoutPicks: {} }
    }

    case 'RESET_ALL': {
      return createInitialState()
    }

    case 'HYDRATE': {
      return action.state
    }

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface TournamentContextValue {
  state: TournamentState
  dispatch: React.Dispatch<TournamentAction>
  groupStandings: Record<GroupId, GroupStanding[]>
  thirdPlaceResults: ThirdPlaceResult[]
  knockoutMatches: KnockoutMatch[]
  allGroupsComplete: boolean
  champion: string | null
}

const TournamentContext = createContext<TournamentContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface TournamentProviderProps {
  children: ReactNode
}

function TournamentProvider({ children }: TournamentProviderProps) {
  const [state, dispatch] = useReducer(tournamentReducer, initialState)
  const [mounted, setMounted] = useState(false)

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as TournamentState
        // Basic validation: ensure expected shape
        if (
          Array.isArray(parsed.groupMatches) &&
          Array.isArray(parsed.knockoutMatches) &&
          typeof parsed.knockoutPicks === 'object'
        ) {
          dispatch({ type: 'HYDRATE', state: parsed })
        }
      }
    } catch {
      // Ignore parse errors, use initial state
    }
    setMounted(true)
  }, [])

  // Persist to localStorage on state change (only after initial hydration)
  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }, [state, mounted])

  // Compute derived state
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
    [state, dispatch, computed]
  )

  return (
    <TournamentContext value={value}>
      {children}
    </TournamentContext>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

function useTournament(): TournamentContextValue {
  const ctx = useContext(TournamentContext)
  if (!ctx) {
    throw new Error('useTournament must be used within a TournamentProvider')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { TournamentProvider, useTournament, TournamentContext, createInitialState, tournamentReducer }
export type { TournamentAction, TournamentContextValue }
