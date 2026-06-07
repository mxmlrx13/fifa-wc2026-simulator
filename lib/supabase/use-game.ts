'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from './client'
import type { PredictionRoundKey } from '@/lib/constants'

interface Player {
  id: string
  displayName: string
  isHost: boolean
  championPick: string | null
}

export interface GameRound {
  roundKey: PredictionRoundKey
  status: 'pending' | 'open' | 'locked' | 'scored'
}

interface Game {
  id: string
  code: string
  name: string
}

interface GameState {
  game: Game | null
  players: Player[]
  currentPlayer: Player | null
  rounds: GameRound[]
  loading: boolean
  error: string | null
}

export function useGame(code: string) {
  const [state, setState] = useState<GameState>({
    game: null,
    players: [],
    currentPlayer: null,
    rounds: [],
    loading: true,
    error: null,
  })

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${code}`)
      if (!res.ok) {
        setState((s) => ({ ...s, loading: false, error: 'Game not found' }))
        return
      }
      const data = await res.json()
      setState({
        game: data.game,
        players: data.players,
        currentPlayer: data.currentPlayer,
        rounds: data.rounds ?? [],
        loading: false,
        error: null,
      })
    } catch (err) {
      console.error('Failed to fetch game:', err)
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? `Failed to load game: ${err.message}` : 'Failed to load game',
      }))
    }
  }, [code])

  useEffect(() => {
    fetchGame()
  }, [fetchGame])

  // Subscribe to game_rounds changes
  useEffect(() => {
    if (!state.game?.id) return

    const supabase = createClient()
    const channel = supabase
      .channel(`game-rounds-${state.game.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rounds',
          filter: `game_id=eq.${state.game.id}`,
        },
        () => {
          // Re-fetch full state when rounds change
          fetchGame()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [state.game?.id, fetchGame])

  return { ...state, refetch: fetchGame }
}
