'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useGame } from '@/lib/supabase/use-game'
import { getHostNextAction, type HostAction } from '@/lib/engine/host-actions'
import { PREDICTION_ROUND_LABELS, type PredictionRoundKey } from '@/lib/constants'
import GameCodeDisplay from '@/components/multiplayer/GameCodeDisplay'
import PlayerList from '@/components/multiplayer/PlayerList'
import LeaderboardTable from '@/components/multiplayer/LeaderboardTable'
import RecoveryLinkDisplay from '@/components/multiplayer/RecoveryLinkDisplay'
import Modal from '@/components/ui/Modal'
import Skeleton from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

type Phase = 'predicting' | 'live' | 'finished'

function derivePhase(rounds: { roundKey: string; status: string }[]): Phase {
  if (rounds.length === 0) return 'predicting'
  const allScored = rounds.every((r) => r.status === 'scored')
  if (allScored) return 'finished'
  const hasLockedOrScored = rounds.some((r) => r.status === 'locked' || r.status === 'scored')
  if (hasLockedOrScored) return 'live'
  return 'predicting'
}

export default function GameDashboard({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const { game, players, currentPlayer, rounds, loading, error, refetch } = useGame(code)
  const [lockModal, setLockModal] = useState<PredictionRoundKey | null>(null)
  const [locking, setLocking] = useState(false)

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton variant="card" className="mb-4" />
        <Skeleton variant="card" className="mb-4" />
        <Skeleton variant="card" />
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm font-medium text-red">{error ?? 'Game not found'}</p>
        <Link href="/play" className="text-[11px] text-muted hover:text-ink hover:underline">
          Back to multiplayer
        </Link>
      </div>
    )
  }

  const isHost = currentPlayer?.isHost ?? false
  const phase = derivePhase(rounds)
  const hostAction: HostAction | null = isHost ? getHostNextAction(rounds) : null

  // Find open round for player CTA
  const openRound = rounds.find((r) => r.status === 'open')

  async function handleLock(roundKey: PredictionRoundKey) {
    setLocking(true)
    try {
      await fetch(`/api/games/${code}/round`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock_round', roundKey }),
      })
      refetch()
    } finally {
      setLocking(false)
      setLockModal(null)
    }
  }

  // ── PREDICTING ──

  if (phase === 'predicting') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 animate-fadeIn">
        <Link href="/play" className="mb-4 inline-block text-[11px] text-muted hover:text-ink">
          &larr; All Games
        </Link>

        {/* Hero card */}
        <div className="mb-8 rounded-[var(--radius-card)] border border-line bg-card px-6 py-8 text-center">
          <h1 className="mb-3 font-[family-name:var(--font-display)] text-[24px] font-bold text-ink">
            {game.name}
          </h1>
          <GameCodeDisplay code={game.code} />
          <p className="mt-3 text-[11px] text-muted">Share this code with friends to join</p>
        </div>

        {/* Primary CTA */}
        {openRound && currentPlayer && (
          <Link
            href={`/play/${code}/predict`}
            className="mb-6 flex items-center justify-center gap-3 rounded-[var(--radius-button)] bg-navy px-6 py-5 text-base font-bold text-paper transition-all hover:brightness-94"
          >
            Enter Predictions
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        )}

        {/* Players + host lock */}
        <div className="grid gap-6 md:grid-cols-2">
          <PlayerList
            code={code}
            players={players}
            currentPlayerId={currentPlayer?.id}
            isHost={isHost}
            onAction={refetch}
            showCompletion
            gameId={game.id}
          />

          <div className="space-y-6">
            {/* Round timeline */}
            <RoundTimeline rounds={rounds} />

            {/* Host: lock action */}
            {isHost && hostAction?.type === 'lock_round' && (
              <button
                onClick={() => setLockModal(hostAction.roundKey)}
                className="w-full rounded-[var(--radius-button)] border border-red/30 bg-card px-4 py-3 text-sm font-bold text-red transition-all hover:bg-red-soft"
              >
                {hostAction.label}
              </button>
            )}

            {currentPlayer?.recoveryToken && (
              <RecoveryLinkDisplay code={code} recoveryToken={currentPlayer.recoveryToken} />
            )}
          </div>
        </div>

        {lockModal && (
          <Modal
            title={`Lock ${PREDICTION_ROUND_LABELS[lockModal]} predictions?`}
            confirmLabel="Lock Predictions"
            confirmVariant="destructive"
            onConfirm={() => handleLock(lockModal)}
            onCancel={() => setLockModal(null)}
            loading={locking}
          >
            <p>
              This will lock predictions for {players.length} player{players.length !== 1 ? 's' : ''}.
              Unlocking will not be possible once results are entered.
            </p>
          </Modal>
        )}
      </div>
    )
  }

  // ── LIVE ──

  if (phase === 'live') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 animate-fadeIn">
        <Link href="/play" className="mb-4 inline-block text-[11px] text-muted hover:text-ink">
          &larr; All Games
        </Link>

        <div className="mb-6 text-center">
          <h1 className="mb-1 font-[family-name:var(--font-display)] text-[24px] font-bold text-ink">{game.name}</h1>
          <GameCodeDisplay code={game.code} />
        </div>

        {/* Leaderboard card */}
        <div className="mb-6">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
            Leaderboard
          </h3>
          <LeaderboardTable code={code} gameId={game.id} compact currentPlayerId={currentPlayer?.id} />
        </div>

        {/* Primary CTA */}
        {isHost && hostAction && hostAction.type !== 'finished' && (
          <div className="mb-4">
            {hostAction.type === 'lock_round' ? (
              <button
                onClick={() => setLockModal(hostAction.roundKey)}
                className="w-full rounded-[var(--radius-button)] bg-navy px-6 py-4 text-sm font-bold text-paper transition-all hover:brightness-94"
              >
                {hostAction.label}
              </button>
            ) : hostAction.type === 'enter_results' ? (
              <Link
                href={`/play/${code}/results`}
                className="flex w-full items-center justify-center gap-3 rounded-[var(--radius-button)] bg-navy px-6 py-4 text-sm font-bold text-paper transition-all hover:brightness-94"
              >
                {hostAction.label}
              </Link>
            ) : hostAction.type === 'open_round' ? (
              <OpenRoundButton code={code} hostAction={hostAction} onAction={refetch} />
            ) : null}
          </div>
        )}

        {!isHost && openRound && currentPlayer && (
          <Link
            href={`/play/${code}/predict`}
            className="mb-4 flex items-center justify-center gap-3 rounded-[var(--radius-button)] bg-navy px-6 py-4 text-sm font-bold text-paper transition-all hover:brightness-94"
          >
            Enter {PREDICTION_ROUND_LABELS[openRound.roundKey as PredictionRoundKey] ?? openRound.roundKey} picks
          </Link>
        )}

        {!isHost && !openRound && currentPlayer && (
          <Link
            href={`/play/${code}/predict`}
            className="mb-4 flex items-center justify-center gap-3 rounded-[var(--radius-button)] border border-line bg-card px-6 py-4 text-sm font-bold text-ink transition-all hover:bg-paper"
          >
            View my predictions
          </Link>
        )}

        {/* Round timeline */}
        <div className="mb-6">
          <RoundTimeline rounds={rounds} />
        </div>

        {/* Links row */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href={`/play/${code}/breakdown`}
            className="flex items-center justify-center rounded-[var(--radius-card)] border border-line bg-card px-4 py-3.5 text-sm font-bold text-ink transition-all hover:bg-paper"
          >
            Breakdown
          </Link>
          <Link
            href={`/play/${code}/compare`}
            className="flex items-center justify-center rounded-[var(--radius-card)] border border-line bg-card px-4 py-3.5 text-sm font-bold text-ink transition-all hover:bg-paper"
          >
            Compare
          </Link>
          <Link
            href={`/play/${code}/leaderboard`}
            className="flex items-center justify-center rounded-[var(--radius-card)] border border-line bg-card px-4 py-3.5 text-sm font-bold text-ink transition-all hover:bg-paper"
          >
            Full Leaderboard
          </Link>
        </div>

        {lockModal && (
          <Modal
            title={`Lock ${PREDICTION_ROUND_LABELS[lockModal]} predictions?`}
            confirmLabel="Lock Predictions"
            confirmVariant="destructive"
            onConfirm={() => handleLock(lockModal)}
            onCancel={() => setLockModal(null)}
            loading={locking}
          >
            <p>
              This will lock predictions for {players.length} player{players.length !== 1 ? 's' : ''}.
              Unlocking will not be possible once results are entered.
            </p>
          </Modal>
        )}
      </div>
    )
  }

  // ── FINISHED ──

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 animate-fadeIn">
      <Link href="/play" className="mb-4 inline-block text-[11px] text-muted hover:text-ink">
        &larr; All Games
      </Link>

      {/* Celebration card */}
      <div className="mb-8 rounded-[var(--radius-card)] border border-line bg-card px-6 py-8 text-center">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
          Tournament Complete
        </p>
        <h1 className="mb-1 font-[family-name:var(--font-display)] text-[28px] font-bold text-ink">
          {game.name}
        </h1>
      </div>

      {/* Final leaderboard */}
      <div className="mb-6">
        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
          Final Standings
        </h3>
        <LeaderboardTable code={code} gameId={game.id} currentPlayerId={currentPlayer?.id} />
      </div>

      {/* Links */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={`/play/${code}/breakdown`}
          className="flex items-center justify-center rounded-[var(--radius-card)] border border-line bg-card px-4 py-3.5 text-sm font-bold text-ink transition-all hover:bg-paper"
        >
          Breakdown
        </Link>
        <Link
          href={`/play/${code}/compare`}
          className="flex items-center justify-center rounded-[var(--radius-card)] border border-line bg-card px-4 py-3.5 text-sm font-bold text-ink transition-all hover:bg-paper"
        >
          Compare
        </Link>
      </div>
    </div>
  )
}

// ── Sub-components ──

function RoundTimeline({ rounds }: { rounds: { roundKey: string; status: string }[] }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-4">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
        Tournament
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {rounds.map((r) => (
          <span
            key={r.roundKey}
            className={cn(
              'rounded-[var(--radius-pill)] px-2.5 py-1 text-[10px] font-bold transition-all',
              r.status === 'scored' && 'bg-win-soft text-win-ink',
              r.status === 'locked' && 'bg-badge-locked-bg text-badge-locked-ink',
              r.status === 'open' && 'bg-navy text-paper',
              r.status === 'pending' && 'border border-line bg-transparent text-muted',
            )}
          >
            {PREDICTION_ROUND_LABELS[r.roundKey as PredictionRoundKey] ?? r.roundKey}
            {r.status === 'scored' && ' \u2713'}
          </span>
        ))}
      </div>
    </div>
  )
}

function OpenRoundButton({
  code,
  hostAction,
  onAction,
}: {
  code: string
  hostAction: HostAction & { type: 'open_round' }
  onAction: () => void
}) {
  const [opening, setOpening] = useState(false)

  async function handleOpen() {
    setOpening(true)
    try {
      await fetch(`/api/games/${code}/round`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open_round', roundKey: hostAction.roundKey }),
      })
      onAction()
    } finally {
      setOpening(false)
    }
  }

  return (
    <button
      onClick={handleOpen}
      disabled={opening}
      className="w-full rounded-[var(--radius-button)] bg-navy px-6 py-4 text-sm font-bold text-paper transition-all hover:brightness-94 disabled:opacity-50"
    >
      {opening ? 'Opening...' : hostAction.label}
    </button>
  )
}
