'use client'

import type { GroupId } from '@/lib/types'
import { useTournament } from '@/lib/store'
import MatchScoreInput from './MatchScoreInput'
import GroupStandingsTable from './GroupStandingsTable'
import { cn } from '@/lib/utils'

interface GroupCardProps {
  groupId: GroupId
}

export default function GroupCard({ groupId }: GroupCardProps) {
  const { state, dispatch, groupStandings } = useTournament()

  const matches = state.groupMatches.filter((m) => m.groupId === groupId)
  const standings = groupStandings[groupId] ?? []

  const completedCount = matches.filter(
    (m) => m.homeScore !== null && m.awayScore !== null
  ).length
  const totalCount = matches.length
  const isComplete = completedCount === totalCount

  const matchdays = [1, 2, 3] as const

  return (
    <div
      id={`group-${groupId}`}
      className={cn(
        'rounded-[var(--radius-card)] border border-line bg-card overflow-hidden transition-all',
        isComplete && 'border-win-ink/30'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="font-[family-name:var(--font-display)] text-[17px] font-bold text-ink">
            Group {groupId}
          </h3>
          <span className={cn(
            'text-[10px] font-semibold tabular-nums',
            isComplete ? 'text-win-ink' : 'text-muted'
          )}>
            {completedCount}/{totalCount}
          </span>
        </div>
        <button
          onClick={() => dispatch({ type: 'RESET_GROUP', groupId })}
          className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-line/40 hover:text-ink"
          title="Reset group"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-line">
        <div
          className={cn(
            'h-full transition-all duration-500',
            isComplete ? 'bg-win-ink' : 'bg-navy'
          )}
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Matches by matchday */}
      <div className="px-2 py-2">
        {matchdays.map((md) => {
          const mdMatches = matches.filter((m) => m.matchday === md)
          return (
            <div key={md}>
              <div className="mb-0.5 mt-1 px-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.09em] text-muted">
                  MD{md}
                </span>
              </div>
              {mdMatches.map((match) => (
                <MatchScoreInput key={match.id} match={match} dispatch={dispatch} />
              ))}
            </div>
          )
        })}
      </div>

      {/* Standings */}
      <div className="border-t border-line px-3 py-2">
        <GroupStandingsTable standings={standings} />
      </div>
    </div>
  )
}
