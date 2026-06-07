'use client'

import { useState } from 'react'
import { shareOrCopy, buildStandingsSnippet } from '@/lib/share'

interface ShareStandingsButtonProps {
  gameName: string
  code: string
  currentPlayerName?: string
}

export default function ShareStandingsButton({ gameName, code, currentPlayerName }: ShareStandingsButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleShare() {
    setLoading(true)
    try {
      const res = await fetch(`/api/games/${code}/leaderboard`)
      if (!res.ok) return
      const data = await res.json()
      const leaderboard = data.leaderboard as Array<{
        rank: number
        displayName: string
        totalPoints: number
      }>

      const payload = buildStandingsSnippet(gameName, leaderboard, currentPlayerName)
      const result = await shareOrCopy(payload)
      setFeedback(result === 'shared' ? 'Shared!' : 'Copied!')
      setTimeout(() => setFeedback(null), 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={loading}
      className="mt-4 w-full rounded-[var(--radius-button)] border border-navy/20 bg-navy/5 px-4 py-3 text-sm font-bold text-navy transition-all hover:bg-navy/10 disabled:opacity-50"
    >
      {feedback ?? (loading ? 'Loading...' : 'Share Standings')}
    </button>
  )
}
