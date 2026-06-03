'use client'

import { use } from 'react'
import Link from 'next/link'
import { useGame } from '@/lib/supabase/use-game'
import GameCodeDisplay from '@/components/multiplayer/GameCodeDisplay'
import PlayerList from '@/components/multiplayer/PlayerList'
import RoundControls from '@/components/multiplayer/RoundControls'
import LeaderboardTable from '@/components/multiplayer/LeaderboardTable'

export default function GameDashboard({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const { game, players, currentPlayer, loading, error, refetch } = useGame(code)

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-500">
        Loading game...
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-neon-red">{error ?? 'Game not found'}</p>
        <Link href="/play" className="text-xs text-accent hover:underline">
          Back to multiplayer
        </Link>
      </div>
    )
  }

  const isHost = currentPlayer?.isHost ?? false

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/play" className="mb-4 inline-block text-xs text-gray-500 hover:text-accent">
        &larr; All Games
      </Link>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold">{game.name}</h1>
        <GameCodeDisplay code={game.code} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6">
          <RoundControls
            code={code}
            predictionsLocked={game.predictions_locked}
            isHost={isHost}
            onAction={refetch}
          />
          <PlayerList players={players} currentPlayerId={currentPlayer?.id} />
        </div>

        {/* Center + Right columns */}
        <div className="space-y-6 md:col-span-2">
          {/* Primary action */}
          {!game.predictions_locked && currentPlayer && (
            <Link
              href={`/play/${code}/predict`}
              className="flex items-center justify-center gap-3 rounded-xl bg-accent px-6 py-5 text-base font-bold text-white shadow-lg transition-all hover:brightness-110 animate-pulse-glow"
            >
              Enter Predictions
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          )}

          {/* Secondary actions */}
          <div className="grid gap-3 sm:grid-cols-2">
            {game.predictions_locked && (
              <Link
                href={`/play/${code}/compare`}
                className="glass-card flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold text-neon-blue transition-all hover:bg-neon-blue/10"
              >
                Compare Predictions
              </Link>
            )}

            {game.predictions_locked && isHost && (
              <Link
                href={`/play/${code}/results`}
                className="glass-card flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold text-neon-green transition-all hover:bg-neon-green/10"
              >
                Enter Results
              </Link>
            )}

            <Link
              href={`/play/${code}/leaderboard`}
              className="glass-card flex items-center justify-center px-4 py-4 text-sm font-bold text-foreground transition-all hover:bg-gray-100"
            >
              Full Leaderboard
            </Link>
          </div>

          {/* Compact leaderboard */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
              Leaderboard
            </h3>
            <LeaderboardTable code={code} gameId={game.id} compact />
          </div>
        </div>
      </div>
    </div>
  )
}
