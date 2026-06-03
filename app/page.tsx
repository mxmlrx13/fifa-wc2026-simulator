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
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]" />
          <div className="absolute left-1/4 top-2/3 h-[300px] w-[300px] rounded-full bg-blue-50 blur-[100px]" />
          <div className="absolute right-1/4 top-1/4 h-[300px] w-[300px] rounded-full bg-green-50 blur-[100px]" />
        </div>

        {/* Confetti-like sparkles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-accent"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                opacity: 0.2 + Math.random() * 0.4,
                animation: `pulse-glow ${2 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
            FIFA World Cup 2026
          </p>
          <div className="mb-4 flex justify-center">
            <TeamBadge teamId={champion!} size="lg" />
          </div>
          <h1 className="mb-2 text-5xl font-extrabold tracking-tight text-accent sm:text-6xl">
            WORLD CHAMPION
          </h1>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/summary"
              className="glass-card glow-accent rounded-lg px-6 py-3 text-sm font-semibold text-accent transition-all hover:bg-accent/10"
            >
              View Summary
            </Link>
            <Link
              href="/groups"
              className="glass-card rounded-lg px-6 py-3 text-sm font-medium text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900"
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
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-[140px]" />
        <div className="absolute left-1/3 top-2/3 h-[400px] w-[400px] rounded-full bg-blue-50 blur-[120px]" />
        <div className="absolute right-1/3 top-1/3 h-[400px] w-[400px] rounded-full bg-green-50 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl text-center animate-slideUp">
        <h1 className="mb-2 text-5xl font-extrabold tracking-tight text-gray-900 sm:text-7xl">
          FIFA WORLD <span className="text-accent">CUP</span>
        </h1>
        <h2 className="mb-1 text-4xl font-extrabold tracking-tight text-accent sm:text-6xl">
          2026
        </h2>
        <p className="mb-8 text-sm font-semibold uppercase tracking-[0.4em] text-gray-500">
          Prediction Simulator
        </p>

        {hasProgress && (
          <div className="mx-auto mb-8 max-w-xs">
            <div className="glass-card rounded-lg px-4 py-3">
              <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                <span>Progress</span>
                <span>{completedMatches}/{totalMatches} matches</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${(completedMatches / totalMatches) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/groups"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-4 text-base font-bold text-white transition-all hover:brightness-110 animate-pulse-glow"
          >
            {hasProgress ? 'CONTINUE PREDICTING' : 'START PREDICTING'}
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          <Link
            href="/play"
            className="inline-flex items-center gap-2 rounded-xl border border-accent/30 px-8 py-4 text-base font-bold text-accent transition-all hover:bg-accent/10"
          >
            PLAY WITH FRIENDS
          </Link>
        </div>

        {hasProgress && !allGroupsComplete && (
          <p className="mt-4 text-xs text-gray-500">
            {completedMatches} of {totalMatches} group matches completed
          </p>
        )}
        {allGroupsComplete && !champion && (
          <div className="mt-4">
            <Link
              href="/knockout"
              className="text-sm font-medium text-neon-green hover:underline"
            >
              Groups complete! Go to Knockout Stage &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
