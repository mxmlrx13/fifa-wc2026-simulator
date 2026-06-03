'use client'

import Link from 'next/link'
import type { GroupId } from '@/lib/types'
import { useTournament } from '@/lib/store'
import GroupStandingsTable from '@/components/groups/GroupStandingsTable'
import ThirdPlaceTable from '@/components/standings/ThirdPlaceTable'
import QualifiedTeamsGrid from '@/components/standings/QualifiedTeamsGrid'

const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export default function StandingsPage() {
  const { groupStandings, thirdPlaceResults, allGroupsComplete } = useTournament()

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 animate-fadeIn">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
        STANDINGS <span className="text-accent">& QUALIFICATION</span>
      </h1>

      {!allGroupsComplete && (
        <div className="mb-6 glass-card rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
          Complete all group matches to see final standings and qualification results.
          <Link href="/groups" className="ml-2 font-semibold text-accent hover:underline">
            Go to Groups
          </Link>
        </div>
      )}

      {/* Mini group standings tables */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Group Tables
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groupIds.map((gid) => (
            <div key={gid} className="glass-card p-3">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">
                Group {gid}
              </h3>
              <GroupStandingsTable standings={groupStandings[gid]} />
            </div>
          ))}
        </div>
      </section>

      {/* Third-place ranking */}
      {allGroupsComplete && thirdPlaceResults.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Third-Place Ranking
          </h2>
          <ThirdPlaceTable results={thirdPlaceResults} />
        </section>
      )}

      {/* Qualified teams grid */}
      {allGroupsComplete && (
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Qualified Teams (32)
          </h2>
          <div className="glass-card p-4">
            <QualifiedTeamsGrid
              groupStandings={groupStandings}
              thirdPlaceResults={thirdPlaceResults}
            />
          </div>
        </section>
      )}

      {/* Proceed button */}
      {allGroupsComplete && (
        <div className="flex justify-center animate-slideUp">
          <Link
            href="/knockout"
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
