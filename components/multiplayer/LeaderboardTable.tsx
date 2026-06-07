'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface LeaderboardEntry {
  playerId: string
  displayName: string
  isHost: boolean
  totalPoints: number
  exactScores: number
  correctResults: number
  matchesScored: number
  rank: number
}

interface LeaderboardTableProps {
  code: string
  gameId?: string
  compact?: boolean
}

export default function LeaderboardTable({ code, gameId, compact }: LeaderboardTableProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchLeaderboard() {
    const res = await fetch(`/api/games/${code}/leaderboard`)
    if (res.ok) {
      const data = await res.json()
      setLeaderboard(data.leaderboard)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [code])

  // Subscribe to score changes
  useEffect(() => {
    if (!gameId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`scores-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scores',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          fetchLeaderboard()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId])

  if (loading) {
    return <div className="text-center text-xs text-gray-500">Loading leaderboard...</div>
  }

  if (leaderboard.length === 0) {
    return <div className="text-center text-xs text-gray-500">No scores yet</div>
  }

  const displayEntries = compact ? leaderboard.slice(0, 5) : leaderboard

  return (
    <div className="glass-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-[10px] uppercase tracking-wider text-gray-500">
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">Player</th>
            <th className="px-4 py-2 text-right">Pts</th>
            {!compact && <th className="px-4 py-2 text-right">Exact</th>}
            {!compact && <th className="px-4 py-2 text-right">Correct</th>}
            {!compact && <th className="px-4 py-2 text-right">Matches</th>}
          </tr>
        </thead>
        <tbody>
          {displayEntries.map((entry) => (
            <tr
              key={entry.playerId}
              className={cn(
                'border-b border-gray-200 transition-colors',
                entry.rank === 1 && 'bg-accent/5',
              )}
            >
              <td className="px-4 py-2.5">
                <span className={cn(
                  'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                  entry.rank === 1 && 'bg-accent/20 text-accent',
                  entry.rank === 2 && 'bg-slate-400/20 text-gray-500',
                  entry.rank === 3 && 'bg-amber-700/20 text-amber-600',
                  entry.rank > 3 && 'text-gray-400',
                )}>
                  {entry.rank}
                </span>
              </td>
              <td className="px-4 py-2.5 font-medium">{entry.displayName}</td>
              <td className="px-4 py-2.5 text-right font-bold text-accent">
                {entry.totalPoints}
              </td>
              {!compact && (
                <td className="px-4 py-2.5 text-right text-neon-green">{entry.exactScores}</td>
              )}
              {!compact && (
                <td className="px-4 py-2.5 text-right text-neon-blue">{entry.correctResults}</td>
              )}
              {!compact && (
                <td className="px-4 py-2.5 text-right text-gray-500">{entry.matchesScored}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
