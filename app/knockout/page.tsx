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
          <h1 className="font-[family-name:var(--font-display)] text-[24px] font-bold tracking-[-0.01em] text-ink">
            Knockout Stage
          </h1>
          {allGroupsComplete && !champion && (
            <p className="mt-1 text-[13.5px] text-muted">
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
              className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-navy px-4 py-2 text-sm font-bold text-paper transition-all hover:brightness-94"
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
        <div className="rounded-[var(--radius-card)] border border-third-ink/20 bg-third-soft px-4 py-3 text-sm text-third-ink">
          Complete all group stage matches before filling in the knockout bracket.{' '}
          <Link href="/groups" className="font-semibold text-navy hover:underline">
            Go to Groups
          </Link>
        </div>
      ) : (
        <BracketView matches={knockoutMatches} />
      )}
    </div>
  )
}
