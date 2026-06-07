'use client'

import { use } from 'react'
import Link from 'next/link'
import type { GroupId } from '@/lib/types'
import { useTournament } from '@/lib/store'
import MatchScoreInput from '@/components/groups/MatchScoreInput'
import GroupStandingsTable from '@/components/groups/GroupStandingsTable'

const validGroupIds = new Set<string>(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'])

export default function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params)
  const { state, dispatch, groupStandings } = useTournament()

  if (!validGroupIds.has(groupId)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <h1 className="text-xl font-bold text-red">Invalid Group</h1>
        <Link href="/groups" className="mt-4 inline-block text-sm text-navy hover:underline">
          Back to Groups
        </Link>
      </div>
    )
  }

  const gid = groupId as GroupId
  const matches = state.groupMatches.filter((m) => m.groupId === gid)
  const standings = groupStandings[gid] ?? []

  const matchdays = [1, 2, 3] as const

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fadeIn">
      <Link
        href="/groups"
        className="mb-4 inline-flex items-center gap-1 text-sm text-navy hover:underline"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Groups
      </Link>

      <div className="rounded-[var(--radius-card)] border border-line bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h1 className="font-[family-name:var(--font-display)] text-[24px] font-bold text-ink">
            Group {groupId}
          </h1>
          <button
            onClick={() => dispatch({ type: 'RESET_GROUP', groupId: gid })}
            className="flex items-center gap-1.5 rounded-md bg-out-soft px-3 py-1.5 text-xs text-muted transition-colors hover:bg-line hover:text-ink"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        </div>

        <div className="px-6 py-4">
          <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
            Matches
          </h2>
          <div className="space-y-1">
            {matchdays.map((md) => {
              const mdMatches = matches.filter((m) => m.matchday === md)
              return (
                <div key={md}>
                  <div className="mb-1 mt-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
                      Matchday {md}
                    </span>
                  </div>
                  {mdMatches.map((match) => (
                    <MatchScoreInput key={match.id} match={match} dispatch={dispatch} />
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        <div className="border-t border-line px-6 py-4">
          <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
            Standings
          </h2>
          <GroupStandingsTable standings={standings} />
        </div>
      </div>
    </div>
  )
}
