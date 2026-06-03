'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface RoundControlsProps {
  code: string
  predictionsLocked: boolean
  isHost: boolean
  onAction: () => void
}

export default function RoundControls({
  code,
  predictionsLocked,
  isHost,
  onAction,
}: RoundControlsProps) {
  const [loading, setLoading] = useState(false)

  async function handleLock() {
    setLoading(true)
    try {
      await fetch(`/api/games/${code}/round`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock' }),
      })
      onAction()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Predictions
        </h3>
        <span className={cn(
          'rounded-full px-2 py-0.5 text-[10px] font-bold',
          predictionsLocked ? 'bg-neon-red/20 text-neon-red' : 'bg-neon-green/20 text-neon-green',
        )}>
          {predictionsLocked ? 'LOCKED' : 'OPEN'}
        </span>
      </div>
      <p className="mb-4 text-sm text-gray-600">
        {predictionsLocked
          ? 'All predictions are locked. Enter results by batch.'
          : 'Players can enter predictions for the full tournament.'}
      </p>

      {isHost && !predictionsLocked && (
        <button
          onClick={handleLock}
          disabled={loading}
          className="w-full rounded-lg bg-neon-red/20 px-4 py-2 text-xs font-bold text-neon-red transition-all hover:bg-neon-red/30 disabled:opacity-50"
        >
          {loading ? '...' : 'Lock All Predictions'}
        </button>
      )}
    </div>
  )
}
