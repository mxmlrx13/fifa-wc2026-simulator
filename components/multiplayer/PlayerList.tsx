'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import Modal from '@/components/ui/Modal'

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
  showCompletion?: boolean
  gameId?: string
}

export default function PlayerList({
  code,
  players,
  currentPlayerId,
  isHost,
  onAction,
  showCompletion,
  gameId,
}: PlayerListProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState<{ type: 'remove' | 'leave' | 'transfer'; playerId: string; name: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [completionCounts, setCompletionCounts] = useState<Record<string, number>>({})

  // Fetch completion counts if needed
  useEffect(() => {
    if (!showCompletion || !gameId) return

    async function fetchCounts() {
      try {
        const res = await fetch(`/api/games/${code}/predictions?completion=true`)
        if (res.ok) {
          const data = await res.json()
          if (data.completionCounts) {
            setCompletionCounts(data.completionCounts)
          }
        }
      } catch {
        // Silently fail
      }
    }
    fetchCounts()
  }, [showCompletion, gameId, code])

  async function handleRemove(playerId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/games/${code}/players/${playerId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Failed to remove player')
      } else {
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
    <>
      <div className="rounded-[var(--radius-card)] border border-line bg-card p-4">
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
          Players ({players.length})
        </h3>
        <div className="space-y-1">
          {players.map((p) => {
            const isSelf = p.id === currentPlayerId
            const count = completionCounts[p.id]

            return (
              <div
                key={p.id}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2',
                  isSelf && 'bg-red-soft',
                )}
              >
                <span className="text-sm font-medium text-ink">
                  {p.displayName}
                  {isSelf && (
                    <span className="ml-1.5 rounded-[5px] bg-red px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase text-white">
                      YOU
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  {showCompletion && count !== undefined && (
                    <span className="text-[11px] font-semibold tabular-nums text-muted">
                      {count}/72
                    </span>
                  )}

                  {p.isHost && (
                    <span className="rounded-[var(--radius-pill)] bg-out-soft px-2 py-0.5 text-[10px] font-bold text-muted">
                      HOST
                    </span>
                  )}

                  {isHost && !p.isHost && !isSelf && (
                    <button
                      onClick={() => setConfirming({ type: 'transfer', playerId: p.id, name: p.displayName })}
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold text-muted hover:bg-line/40 hover:text-ink"
                      title="Make host"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    </button>
                  )}

                  {isHost && !p.isHost && !isSelf && (
                    <button
                      onClick={() => setConfirming({ type: 'remove', playerId: p.id, name: p.displayName })}
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold text-muted hover:bg-red-soft hover:text-red"
                      title="Remove player"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}

                  {isSelf && !p.isHost && (
                    <button
                      onClick={() => setConfirming({ type: 'leave', playerId: p.id, name: p.displayName })}
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold text-muted hover:bg-red-soft hover:text-red"
                      title="Leave game"
                    >
                      Leave
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {confirming && (
        <Modal
          title={
            confirming.type === 'transfer'
              ? 'Transfer Host?'
              : confirming.type === 'remove'
                ? 'Remove Player?'
                : 'Leave Game?'
          }
          confirmLabel={confirming.type === 'transfer' ? 'Transfer' : 'Confirm'}
          confirmVariant={confirming.type === 'transfer' ? 'primary' : 'destructive'}
          onConfirm={() => {
            if (confirming.type === 'transfer') handleTransfer(confirming.playerId)
            else handleRemove(confirming.playerId)
          }}
          onCancel={() => setConfirming(null)}
          loading={loading}
        >
          {confirming.type === 'transfer' && (
            <p>
              Make <strong className="text-ink">{confirming.name}</strong> the host? You will lose lock and results powers.
            </p>
          )}
          {confirming.type === 'remove' && (
            <p>
              Remove <strong className="text-ink">{confirming.name}</strong>? Their predictions and scores will be deleted.
            </p>
          )}
          {confirming.type === 'leave' && (
            <p>
              Leave this game? Your predictions and scores will be deleted.
            </p>
          )}
        </Modal>
      )}
    </>
  )
}
