'use client'

import Link from 'next/link'
import type { GroupId } from '@/lib/types'
import { useTournament } from '@/lib/store'
import GroupCard from '@/components/groups/GroupCard'
import { cn } from '@/lib/utils'

const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export default function GroupsPage() {
  const { state, allGroupsComplete } = useTournament()

  const completedMatches = state.groupMatches.filter(
    (m) => m.homeScore !== null && m.awayScore !== null
  ).length
  const totalMatches = state.groupMatches.length

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          GROUP <span className="text-accent">STAGE</span>
        </h1>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                allGroupsComplete ? 'bg-neon-green' : 'bg-accent'
              )}
              style={{ width: `${(completedMatches / totalMatches) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-500">
            {completedMatches}/{totalMatches}
          </span>
        </div>

        {/* Group pills navigation */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {groupIds.map((id) => {
            const groupMatches = state.groupMatches.filter((m) => m.groupId === id)
            const done = groupMatches.every(
              (m) => m.homeScore !== null && m.awayScore !== null
            )
            return (
              <a
                key={id}
                href={`#group-${id}`}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                  done
                    ? 'bg-neon-green/15 text-neon-green'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                )}
              >
                {id}
              </a>
            )
          })}
        </div>
      </div>

      {/* Group cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {groupIds.map((id) => (
          <GroupCard key={id} groupId={id} />
        ))}
      </div>

      {/* Proceed button */}
      {allGroupsComplete && (
        <div className="mt-8 flex justify-center animate-slideUp">
          <Link
            href="/standings"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-4 text-base font-bold text-white transition-all hover:brightness-110 animate-pulse-glow"
          >
            PROCEED TO KNOCKOUT
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}
