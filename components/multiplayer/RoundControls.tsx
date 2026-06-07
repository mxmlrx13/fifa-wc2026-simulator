'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PREDICTION_ROUND_LABELS, type PredictionRoundKey } from '@/lib/constants'
import type { GameRound } from '@/lib/supabase/use-game'

interface RoundControlsProps {
  code: string
  rounds: GameRound[]
  isHost: boolean
  onAction: () => void
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-200 text-gray-500',
  open: 'bg-neon-green/20 text-neon-green',
  locked: 'bg-neon-red/20 text-neon-red',
  scored: 'bg-neon-blue/20 text-neon-blue',
}

export default function RoundControls({
  code,
  rounds,
  isHost,
  onAction,
}: RoundControlsProps) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleAction(action: 'lock_round' | 'unlock_round', roundKey: PredictionRoundKey) {
    setLoading(roundKey)
    try {
      await fetch(`/api/games/${code}/round`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, roundKey }),
      })
      onAction()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="glass-card p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
        Prediction Rounds
      </h3>
      <div className="space-y-2">
        {rounds.map((round) => (
          <div key={round.roundKey} className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-700">
              {PREDICTION_ROUND_LABELS[round.roundKey as PredictionRoundKey] ?? round.roundKey}
            </span>
            <div className="flex items-center gap-2">
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                statusColors[round.status] ?? statusColors.pending,
              )}>
                {round.status}
              </span>
              {isHost && round.status === 'open' && (
                <button
                  onClick={() => handleAction('lock_round', round.roundKey as PredictionRoundKey)}
                  disabled={loading === round.roundKey}
                  className="rounded px-2 py-0.5 text-[10px] font-bold text-neon-red hover:bg-neon-red/10 disabled:opacity-50"
                >
                  {loading === round.roundKey ? '...' : 'Lock'}
                </button>
              )}
              {isHost && round.status === 'locked' && (
                <button
                  onClick={() => handleAction('unlock_round', round.roundKey as PredictionRoundKey)}
                  disabled={loading === round.roundKey}
                  className="rounded px-2 py-0.5 text-[10px] font-bold text-neon-green hover:bg-neon-green/10 disabled:opacity-50"
                >
                  {loading === round.roundKey ? '...' : 'Unlock'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
