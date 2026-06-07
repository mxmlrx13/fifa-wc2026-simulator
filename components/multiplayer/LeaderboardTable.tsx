'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import EmptyState from '@/components/ui/EmptyState'
import Skeleton from '@/components/ui/Skeleton'

interface Movement {
  direction: 'up' | 'down' | 'same' | 'new'
  delta: number
}

interface LeaderboardEntry {
  playerId: string
  displayName: string
  isHost: boolean
  totalPoints: number
  exactScores: number
  correctResults: number
  matchesScored: number
  championBonus: number
  rank: number
  movement?: Movement
}

interface LeaderboardTableProps {
  code: string
  gameId?: string
  compact?: boolean
  currentPlayerId?: string
}

function MovementChip({ movement }: { movement?: Movement }) {
  if (!movement || movement.direction === 'new' || movement.direction === 'same') {
    if (movement?.direction === 'same') {
      return <span className="text-[9px] text-muted">&ndash;</span>
    }
    return null
  }

  if (movement.direction === 'up') {
    return (
      <span className="rounded-[3px] bg-win-soft px-1 py-px text-[9px] font-bold tabular-nums text-win-ink">
        &#9650;{movement.delta}
      </span>
    )
  }

  return (
    <span className="rounded-[3px] bg-red-soft px-1 py-px text-[9px] font-bold tabular-nums text-red">
      &#9660;{movement.delta}
    </span>
  )
}

export default function LeaderboardTable({ code, gameId, compact, currentPlayerId }: LeaderboardTableProps) {
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
    return (
      <div className="space-y-2 p-4">
        <Skeleton variant="row" />
        <Skeleton variant="row" />
        <Skeleton variant="row" />
      </div>
    )
  }

  if (leaderboard.length === 0) {
    return <EmptyState label="Leaderboard" message="No scores yet. Scores will appear after the host enters results." />
  }

  // Compact: show top 3 + current user if outside top 3
  let displayEntries = leaderboard
  let moreCount = 0
  if (compact) {
    const top3 = leaderboard.slice(0, 3)
    const currentInTop3 = currentPlayerId && top3.some((e) => e.playerId === currentPlayerId)
    if (currentPlayerId && !currentInTop3) {
      const currentEntry = leaderboard.find((e) => e.playerId === currentPlayerId)
      if (currentEntry) {
        displayEntries = [...top3, currentEntry]
        moreCount = leaderboard.length - 4
      } else {
        displayEntries = top3
        moreCount = leaderboard.length - 3
      }
    } else {
      displayEntries = top3
      moreCount = leaderboard.length - 3
    }
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-paper text-left text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
            <th className="px-4 py-2 w-10">#</th>
            <th className="px-4 py-2">Player</th>
            <th className="px-4 py-2 text-right">Pts</th>
            <th className="hidden md:table-cell px-4 py-2 text-right">Exact</th>
          </tr>
        </thead>
        <tbody>
          {displayEntries.map((entry, idx) => {
            const isYou = entry.playerId === currentPlayerId
            // Show separator before "you" row if not contiguous with top 3
            const showSeparator = compact && idx === 3 && entry.rank > 4

            return (
              <tr
                key={entry.playerId}
                className={cn(
                  'border-b border-line transition-colors',
                  isYou && 'bg-red-soft',
                  showSeparator && 'border-t-2 border-t-line',
                )}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums',
                      entry.rank === 1 && 'bg-win-soft text-win-ink',
                      entry.rank === 2 && 'bg-runner-soft text-runner-ink',
                      entry.rank === 3 && 'bg-third-soft text-third-ink',
                      entry.rank > 3 && 'text-muted',
                    )}>
                      {entry.rank}
                    </span>
                    <MovementChip movement={entry.movement} />
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {compact ? (
                    <span className="font-semibold text-ink">
                      {entry.displayName}
                      {isYou && (
                        <span className="ml-1.5 rounded-[5px] bg-red px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase text-white">
                          YOU
                        </span>
                      )}
                    </span>
                  ) : (
                    <Link
                      href={`/play/${code}/breakdown?player=${entry.playerId}`}
                      className="font-semibold text-ink hover:underline"
                    >
                      {entry.displayName}
                      {isYou && (
                        <span className="ml-1.5 rounded-[5px] bg-red px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase text-white">
                          YOU
                        </span>
                      )}
                    </Link>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-extrabold text-ink tabular-nums">
                  {entry.totalPoints}
                </td>
                <td className="hidden md:table-cell px-4 py-2.5 text-right text-win-ink tabular-nums">
                  {entry.exactScores}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {compact && moreCount > 0 && (
        <Link
          href={`/play/${code}/leaderboard`}
          className="block border-t border-line px-4 py-2.5 text-center text-[11px] font-bold text-navy hover:bg-paper"
        >
          + {moreCount} more
        </Link>
      )}
    </div>
  )
}
