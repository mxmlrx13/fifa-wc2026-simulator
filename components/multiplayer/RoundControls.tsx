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

const statusBadge: Record<string, string> = {
  pending: 'bg-badge-bg text-badge-ink',
  open: 'bg-badge-open-bg text-badge-open-ink',
  locked: 'bg-badge-locked-bg text-badge-locked-ink',
  scored: 'bg-runner-soft text-runner-ink',
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
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-4">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
        Prediction Rounds
      </h3>
      <div className="space-y-2">
        {rounds.map((round) => (
          <div key={round.roundKey} className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-ink">
              {PREDICTION_ROUND_LABELS[round.roundKey as PredictionRoundKey] ?? round.roundKey}
            </span>
            <div className="flex items-center gap-2">
              <span className={cn(
                'rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] font-semibold uppercase',
                statusBadge[round.status] ?? statusBadge.pending,
              )}>
                {round.status}
              </span>
              {isHost && round.status === 'open' && (
                <button
                  onClick={() => handleAction('lock_round', round.roundKey as PredictionRoundKey)}
                  disabled={loading === round.roundKey}
                  className="rounded px-2 py-0.5 text-[10px] font-bold text-red hover:bg-red-soft disabled:opacity-50"
                >
                  {loading === round.roundKey ? '...' : 'Lock'}
                </button>
              )}
              {isHost && round.status === 'locked' && (
                <button
                  onClick={() => handleAction('unlock_round', round.roundKey as PredictionRoundKey)}
                  disabled={loading === round.roundKey}
                  className="rounded px-2 py-0.5 text-[10px] font-bold text-win-ink hover:bg-win-soft disabled:opacity-50"
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
