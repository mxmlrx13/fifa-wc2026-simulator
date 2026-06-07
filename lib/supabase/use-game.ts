'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from './client'

interface Player {
  id: string
  displayName: string
  isHost: boolean
}

interface Game {
  id: string
  code: string
  name: string
  current_round: string
  round_locked: boolean
  predictions_locked: boolean
}

interface GameState {
  game: Game | null
  players: Player[]
  currentPlayer: Player | null
  loading: boolean
  error: string | null
}

export function useGame(code: string) {
  const [state, setState] = useState<GameState>({
    game: null,
    players: [],
    currentPlayer: null,
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

  // Subscribe to game changes (predictions lock, round updates)
  useEffect(() => {
    if (!state.game?.id) return

    const supabase = createClient()
    const channel = supabase
      .channel(`game-${state.game.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${state.game.id}`,
        },
        (payload) => {
          setState((s) => ({
            ...s,
            game: s.game ? { ...s.game, ...payload.new } : null,
          }))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [state.game?.id])

  return { ...state, refetch: fetchGame }
}
