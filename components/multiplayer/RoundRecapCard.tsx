'use client'

import { useEffect, useState } from 'react'
import { getRoundLabel, getAllRounds, type RoundKey } from '@/lib/engine/rounds'

const LAST_SEEN_KEY = 'wc26-last-seen-batch'

function getLastSeen(code: string): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(`${LAST_SEEN_KEY}:${code}`)
}

function setLastSeen(code: string, batch: string) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(`${LAST_SEEN_KEY}:${code}`, batch)
}

interface RecapData {
  pointsGained: number
  exactScores: number
  prevRank: number | null
  currentRank: number | null
  leaderName: string | null
  leaderPoints: number
  batch: string
}

interface RoundRecapCardProps {
  code: string
  gameId: string
  currentPlayerId?: string
}

export default function RoundRecapCard({ code, currentPlayerId }: RoundRecapCardProps) {
  const [recap, setRecap] = useState<RecapData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!currentPlayerId) return

    async function fetchRecap() {
      const res = await fetch(`/api/games/${code}/leaderboard`)
      if (!res.ok) return
      const data = await res.json()
      const latestBatch = data.latestBatch as string | null
      if (!latestBatch) return

      const lastSeen = getLastSeen(code)

      // If already seen this batch, don't show
      if (lastSeen === latestBatch) return

      // If no previous last-seen, this is the first time — show recap
      const allRounds = getAllRounds()
      const latestIdx = allRounds.indexOf(latestBatch as RoundKey)
      const lastSeenIdx = lastSeen ? allRounds.indexOf(lastSeen as RoundKey) : -1

      // Only show if latest batch is actually newer
      if (lastSeen && latestIdx <= lastSeenIdx) return

      const leaderboard = data.leaderboard as Array<{
        playerId: string
        displayName: string
        totalPoints: number
        exactScores: number
        rank: number
        movement?: { direction: string; delta: number }
      }>

      const me = leaderboard.find((e) => e.playerId === currentPlayerId)
      if (!me) return

      const leader = leaderboard[0]
      const prevRank = me.movement?.direction === 'new' ? null
        : me.movement?.direction === 'up' ? me.rank + (me.movement?.delta ?? 0)
        : me.movement?.direction === 'down' ? me.rank - (me.movement?.delta ?? 0)
        : me.rank

      setRecap({
        pointsGained: me.totalPoints, // We show total since last snapshot isn't easily computed client-side
        exactScores: me.exactScores,
        prevRank,
        currentRank: me.rank,
        leaderName: leader.playerId !== currentPlayerId ? leader.displayName : null,
        leaderPoints: leader.totalPoints,
        batch: latestBatch,
      })
    }
    fetchRecap()
  }, [code, currentPlayerId])

  function handleDismiss() {
    if (recap) {
      setLastSeen(code, recap.batch)
    }
    setDismissed(true)
  }

  if (!recap || dismissed) return null

  const batchLabel = getRoundLabel(recap.batch as RoundKey)
  const rankChanged = recap.prevRank !== null && recap.prevRank !== recap.currentRank

  return (
    <div className="mb-6 rounded-[var(--radius-card)] border border-red/20 bg-red-soft px-5 py-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.09em] text-red">
          {batchLabel} scored
        </h3>
        <button
          onClick={handleDismiss}
          className="text-[10px] font-bold text-red/60 hover:text-red transition-colors"
        >
          Dismiss
        </button>
      </div>

      <div className="space-y-1 text-[13px] text-ink">
        {rankChanged && recap.prevRank !== null && recap.currentRank !== null && (
          <p>
            You moved <span className="font-bold">#{recap.prevRank}</span> &rarr;{' '}
            <span className="font-bold">#{recap.currentRank}</span>
          </p>
        )}
        {!rankChanged && recap.currentRank !== null && (
          <p>
            You hold <span className="font-bold">#{recap.currentRank}</span>
          </p>
        )}
        <p className="text-[12px] text-muted">
          {recap.exactScores} exact score{recap.exactScores !== 1 ? 's' : ''} total
          {recap.leaderName && (
            <span>
              {' '}&middot; {recap.leaderName} leads with {recap.leaderPoints} pts
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
