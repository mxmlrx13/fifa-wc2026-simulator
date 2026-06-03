'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useGame } from '@/lib/supabase/use-game'
import { getAllRounds, getRoundLabel, type RoundKey } from '@/lib/engine/rounds'
import PredictionComparison from '@/components/multiplayer/PredictionComparison'
import { cn } from '@/lib/utils'

export default function ComparePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const { game, players, loading } = useGame(code)
  const [selectedRound, setSelectedRound] = useState<RoundKey>('group_md1')

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-500">Loading...</div>
  }

  if (!game) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-neon-red">Game not found</p>
        <Link href="/play" className="text-xs text-accent hover:underline">Back</Link>
      </div>
    )
  }

  const allRounds = getAllRounds()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href={`/play/${code}`} className="mb-4 inline-block text-xs text-gray-500 hover:text-accent">
        &larr; Dashboard
      </Link>

      <h1 className="mb-6 text-xl font-bold text-accent">Prediction Comparison</h1>

      {/* Round selector */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {allRounds.map((round) => (
          <button
            key={round}
            onClick={() => setSelectedRound(round)}
            className={cn(
              'rounded-md px-2.5 py-1.5 text-xs font-bold transition-all',
              selectedRound === round
                ? 'bg-accent text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
            )}
          >
            {getRoundLabel(round).replace('Group Stage — ', '')}
          </button>
        ))}
      </div>

      <PredictionComparison
        code={code}
        round={selectedRound}
        players={players}
      />
    </div>
  )
}
