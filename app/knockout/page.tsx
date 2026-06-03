'use client'

import Link from 'next/link'
import { useTournament } from '@/lib/store'
import BracketView from '@/components/knockout/BracketView'
import ResetButton from '@/components/shared/ResetButton'

export default function KnockoutPage() {
  const { knockoutMatches, allGroupsComplete, champion, dispatch } = useTournament()

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 animate-fadeIn">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            KNOCKOUT <span className="text-accent">STAGE</span>
          </h1>
          {allGroupsComplete && !champion && (
            <p className="mt-1 text-xs text-gray-500">
              Pick winners to advance through the bracket
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {allGroupsComplete && (
            <ResetButton
              label="Reset Knockout"
              onConfirm={() => dispatch({ type: 'RESET_KNOCKOUT' })}
              confirmMessage="Reset all knockout picks? This cannot be undone."
            />
          )}
          {champion && (
            <Link
              href="/summary"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white transition-all hover:brightness-110 animate-pulse-glow"
            >
              View Champion
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          )}
        </div>
      </div>

      {!allGroupsComplete ? (
        <div className="glass-card rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
          Complete all group stage matches before filling in the knockout bracket.{' '}
          <Link href="/groups" className="font-semibold text-accent hover:underline">
            Go to Groups
          </Link>
        </div>
      ) : (
        <BracketView matches={knockoutMatches} />
      )}
    </div>
  )
}
