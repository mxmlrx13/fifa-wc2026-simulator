'use client'

import { use } from 'react'
import Link from 'next/link'
import { useGame } from '@/lib/supabase/use-game'
import LeaderboardTable from '@/components/multiplayer/LeaderboardTable'

export default function LeaderboardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const { game, loading } = useGame(code)

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-500">Loading...</div>
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/play/${code}`} className="mb-4 inline-block text-xs text-gray-500 hover:text-accent">
        &larr; Dashboard
      </Link>

      <h1 className="mb-6 text-xl font-bold text-accent">
        {game?.name ?? 'Game'} — Leaderboard
      </h1>

      <LeaderboardTable code={code} gameId={game?.id} />
    </div>
  )
}
