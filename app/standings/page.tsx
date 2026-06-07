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
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-[24px] font-bold tracking-[-0.01em] text-ink">
        Standings & Qualification
      </h1>

      {!allGroupsComplete && (
        <div className="mb-6 rounded-[var(--radius-card)] border border-third-ink/20 bg-third-soft px-4 py-3 text-sm text-third-ink">
          Complete all group matches to see final standings and qualification results.
          <Link href="/groups" className="ml-2 font-semibold text-navy hover:underline">
            Go to Groups
          </Link>
        </div>
      )}

      {/* Mini group standings tables */}
      <section className="mb-8">
        <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
          Group Tables
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groupIds.map((gid) => (
            <div key={gid} className="rounded-[var(--radius-card)] border border-line bg-card p-3">
              <h3 className="mb-2 font-[family-name:var(--font-display)] text-[17px] font-bold text-ink">
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
          <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
            Third-Place Ranking
          </h2>
          <ThirdPlaceTable results={thirdPlaceResults} />
        </section>
      )}

      {/* Qualified teams grid */}
      {allGroupsComplete && (
        <section className="mb-8">
          <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
            Qualified Teams (32)
          </h2>
          <div className="rounded-[var(--radius-card)] border border-line bg-card p-4">
            <QualifiedTeamsGrid
              groupStandings={groupStandings}
              thirdPlaceResults={thirdPlaceResults}
            />
          </div>
        </section>
      )}

      {/* Proceed button */}
      {allGroupsComplete && (
        <div className="flex justify-center animate-fadeIn">
          <Link
            href="/knockout"
            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-navy px-8 py-4 text-base font-bold text-paper transition-all hover:brightness-94"
          >
            Proceed to Knockout
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}
