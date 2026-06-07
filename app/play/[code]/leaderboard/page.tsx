'use client'

import { use } from 'react'
import Link from 'next/link'
import { useGame } from '@/lib/supabase/use-game'
import LeaderboardTable from '@/components/multiplayer/LeaderboardTable'
import Skeleton from '@/components/ui/Skeleton'

export default function LeaderboardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const { game, currentPlayer, loading } = useGame(code)

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Skeleton variant="card" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/play/${code}`} className="mb-4 inline-block text-[11px] text-muted hover:text-ink">
        &larr; Dashboard
      </Link>

      <h1 className="mb-6 font-[family-name:var(--font-display)] text-[24px] font-bold text-ink">
        {game?.name ?? 'Game'} — Leaderboard
      </h1>

      <LeaderboardTable code={code} gameId={game?.id} currentPlayerId={currentPlayer?.id} />
    </div>
  )
}
