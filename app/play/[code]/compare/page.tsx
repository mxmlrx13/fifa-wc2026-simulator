'use client'

import { use, useState, useMemo } from 'react'
import Link from 'next/link'
import { useGame } from '@/lib/supabase/use-game'
import { PREDICTION_ROUNDS, PREDICTION_ROUND_LABELS, type PredictionRoundKey } from '@/lib/constants'
import PredictionComparison from '@/components/multiplayer/PredictionComparison'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

export default function ComparePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const { game, players, currentPlayer, rounds, loading } = useGame(code)

  // Only show rounds that are locked or scored
  const visibleRounds = useMemo(() => {
    const statusMap = new Map(rounds.map((r) => [r.roundKey, r.status]))
    return PREDICTION_ROUNDS.filter(
      (rk) => statusMap.get(rk) === 'locked' || statusMap.get(rk) === 'scored',
    )
  }, [rounds])

  const [selectedRound, setSelectedRound] = useState<PredictionRoundKey | null>(null)

  // Derive the effective round — fallback to first visible if selection is invalid
  const effectiveRound = selectedRound && visibleRounds.includes(selectedRound)
    ? selectedRound
    : visibleRounds[0] ?? null

  // Is group round locked? → show champion picks
  const groupLocked = useMemo(() => {
    const groupRound = rounds.find((r) => r.roundKey === 'group')
    return groupRound ? groupRound.status === 'locked' || groupRound.status === 'scored' : false
  }, [rounds])

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Skeleton variant="card" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm font-medium text-red">Game not found</p>
        <Link href="/play" className="text-[11px] text-muted hover:text-ink hover:underline">Back</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-fadeIn">
      <Link href={`/play/${code}`} className="mb-4 inline-block text-[11px] text-muted hover:text-ink">
        &larr; Dashboard
      </Link>

      <h1 className="mb-6 font-[family-name:var(--font-display)] text-[24px] font-bold text-ink">
        Compare Predictions
      </h1>

      {visibleRounds.length === 0 ? (
        <EmptyState
          label="Predictions locked"
          message="Predictions will be visible here once the host locks a round."
        />
      ) : (
        <>
          {/* Round selector — only locked/scored rounds */}
          <div className="mb-6 flex flex-wrap gap-1.5">
            {visibleRounds.map((rk) => {
              const roundStatus = rounds.find((r) => r.roundKey === rk)?.status
              return (
                <button
                  key={rk}
                  onClick={() => setSelectedRound(rk)}
                  className={cn(
                    'rounded-[var(--radius-pill)] px-2.5 py-1 text-[10px] font-bold transition-all',
                    effectiveRound === rk
                      ? 'bg-navy text-paper'
                      : roundStatus === 'scored'
                        ? 'bg-win-soft text-win-ink hover:brightness-95'
                        : 'bg-out-soft text-muted hover:bg-line hover:text-ink',
                  )}
                >
                  {PREDICTION_ROUND_LABELS[rk]}
                  {roundStatus === 'scored' && ' \u2713'}
                </button>
              )
            })}
          </div>

          {/* Champion picks row — visible once group is locked */}
          {groupLocked && players.length > 0 && (
            <div className="mb-6 rounded-[var(--radius-card)] border border-line bg-card p-4">
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
                Champion Picks
              </h3>
              <div className="flex flex-wrap gap-3">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <span className={cn(
                      'text-[12px] font-semibold',
                      p.id === currentPlayer?.id ? 'text-red' : 'text-ink',
                    )}>
                      {p.displayName}:
                    </span>
                    <span className="rounded-[var(--radius-pill)] bg-out-soft px-2 py-0.5 text-[11px] font-bold tabular-nums text-ink">
                      {p.championPick ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {effectiveRound && (
            <PredictionComparison
              code={code}
              round={effectiveRound}
              players={players}
              currentPlayerId={currentPlayer?.id}
            />
          )}
        </>
      )}
    </div>
  )
}
