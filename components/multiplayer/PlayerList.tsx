'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Player {
  id: string
  displayName: string
  isHost: boolean
}

interface PlayerListProps {
  code: string
  players: Player[]
  currentPlayerId?: string
  isHost: boolean
  onAction: () => void
}

export default function PlayerList({ code, players, currentPlayerId, isHost, onAction }: PlayerListProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState<{ type: 'remove' | 'leave' | 'transfer'; playerId: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleRemove(playerId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/games/${code}/players/${playerId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Failed to remove player')
      } else {
        // If the player removed themselves, redirect
        if (playerId === currentPlayerId) {
          router.push('/play')
          return
        }
        onAction()
      }
    } finally {
      setLoading(false)
      setConfirming(null)
    }
  }

  async function handleTransfer(playerId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/games/${code}/round`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transfer_host', playerId }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Failed to transfer host')
      } else {
        onAction()
      }
    } finally {
      setLoading(false)
      setConfirming(null)
    }
  }

  return (
    <div className="glass-card p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
        Players ({players.length})
      </h3>
      <div className="space-y-2">
        {players.map((p) => {
          const isSelf = p.id === currentPlayerId
          const showConfirm = confirming?.playerId === p.id

          return (
            <div key={p.id}>
              <div
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2',
                  isSelf && 'bg-accent/10',
                )}
              >
                <span className="text-sm font-medium">
                  {p.displayName}
                  {isSelf && (
                    <span className="ml-1.5 text-xs text-accent">(you)</span>
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  {p.isHost && (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                      HOST
                    </span>
                  )}

                  {/* Host: make host button for non-host players */}
                  {isHost && !p.isHost && !isSelf && (
                    <button
                      onClick={() => setConfirming({ type: 'transfer', playerId: p.id })}
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Make host"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    </button>
                  )}

                  {/* Host: remove button for non-host players */}
                  {isHost && !p.isHost && !isSelf && (
                    <button
                      onClick={() => setConfirming({ type: 'remove', playerId: p.id })}
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold text-gray-400 hover:bg-neon-red/10 hover:text-neon-red"
                      title="Remove player"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}

                  {/* Non-host self: leave button */}
                  {isSelf && !p.isHost && (
                    <button
                      onClick={() => setConfirming({ type: 'leave', playerId: p.id })}
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold text-gray-400 hover:bg-neon-red/10 hover:text-neon-red"
                      title="Leave game"
                    >
                      Leave
                    </button>
                  )}
                </div>
              </div>

              {/* Confirmation dialog */}
              {showConfirm && (
                <div className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-xs">
                  {confirming.type === 'transfer' && (
                    <p className="mb-2 text-gray-600">
                      Make <strong>{p.displayName}</strong> the host? You will lose lock/results powers.
                    </p>
                  )}
                  {confirming.type === 'remove' && (
                    <p className="mb-2 text-gray-600">
                      Remove <strong>{p.displayName}</strong>? Their predictions and scores will be deleted.
                    </p>
                  )}
                  {confirming.type === 'leave' && (
                    <p className="mb-2 text-gray-600">
                      Leave this game? Your predictions and scores will be deleted.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (confirming.type === 'transfer') handleTransfer(p.id)
                        else handleRemove(p.id)
                      }}
                      disabled={loading}
                      className={cn(
                        'rounded px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50',
                        confirming.type === 'transfer' ? 'bg-accent' : 'bg-neon-red',
                      )}
                    >
                      {loading ? '...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirming(null)}
                      className="rounded px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
