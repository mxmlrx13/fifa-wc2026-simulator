'use client'

import Link from 'next/link'
import { useTournament } from '@/lib/store'
import { teamsMap } from '@/lib/data/teams'
import TeamBadge from '@/components/shared/TeamBadge'

export default function Home() {
  const { state, allGroupsComplete, champion } = useTournament()

  const completedMatches = state.groupMatches.filter(
    (m) => m.homeScore !== null && m.awayScore !== null
  ).length
  const totalMatches = state.groupMatches.length
  const hasProgress = completedMatches > 0

  const championTeam = champion ? teamsMap[champion] : null

  // Champion celebration
  if (championTeam) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 animate-fadeIn">
        <div className="relative z-10 text-center">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
            FIFA World Cup 2026
          </p>
          <div className="mb-4 flex justify-center">
            <TeamBadge teamId={champion!} size="lg" />
          </div>
          <h1 className="mb-2 font-[family-name:var(--font-display)] text-[28px] font-bold tracking-tight text-ink">
            World Champion
          </h1>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/summary"
              className="inline-flex items-center justify-center rounded-[var(--radius-button)] bg-navy px-6 py-3 text-sm font-bold text-paper transition-all hover:brightness-94"
            >
              View Summary
            </Link>
            <Link
              href="/groups"
              className="inline-flex items-center justify-center rounded-[var(--radius-button)] border border-line bg-card px-6 py-3 text-sm font-medium text-muted transition-all hover:text-ink hover:bg-paper"
            >
              Review Groups
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4">
      <div className="relative z-10 max-w-2xl text-center animate-fadeIn">
        <h1 className="mb-2 font-[family-name:var(--font-display)] text-[40px] font-bold tracking-tight text-ink sm:text-[56px]">
          FIFA World Cup
        </h1>
        <h2 className="mb-1 font-[family-name:var(--font-display)] text-[32px] font-bold tracking-tight text-red sm:text-[48px]">
          2026
        </h2>
        <p className="mb-8 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
          Prediction Simulator
        </p>

        {hasProgress && (
          <div className="mx-auto mb-8 max-w-xs">
            <div className="rounded-[var(--radius-card)] border border-line bg-card px-4 py-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
                <span>Progress</span>
                <span className="tabular-nums">{completedMatches}/{totalMatches} matches</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-red transition-all duration-500"
                  style={{ width: `${(completedMatches / totalMatches) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/groups"
            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-navy px-8 py-4 text-base font-bold text-paper transition-all hover:brightness-94"
          >
            {hasProgress ? 'Continue Predicting' : 'Start Predicting'}
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          <Link
            href="/play"
            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-line bg-card px-8 py-4 text-base font-bold text-ink transition-all hover:bg-paper"
          >
            Play with Friends
          </Link>
        </div>

        {hasProgress && !allGroupsComplete && (
          <p className="mt-4 text-[11px] text-muted">
            {completedMatches} of {totalMatches} group matches completed
          </p>
        )}
        {allGroupsComplete && !champion && (
          <div className="mt-4">
            <Link
              href="/knockout"
              className="text-sm font-semibold text-win-ink hover:underline"
            >
              Groups complete! Go to Knockout Stage &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
