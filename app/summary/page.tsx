'use client'

import Link from 'next/link'
import { useTournament } from '@/lib/store'
import { teamsMap } from '@/lib/data/teams'
import TeamBadge from '@/components/shared/TeamBadge'
import ResetButton from '@/components/shared/ResetButton'
import type { GroupId } from '@/lib/types'

function flagEmoji(flagCode: string): string {
  if (flagCode === 'gb-eng') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'
  if (flagCode === 'gb-sct') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'
  if (flagCode === 'gb-wls') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}'
  const code = flagCode.toUpperCase()
  return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + 0x1F1A5))
}

export default function SummaryPage() {
  const { state, knockoutMatches, champion, groupStandings, dispatch } = useTournament()

  if (!champion) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <h1 className="mb-4 font-[family-name:var(--font-display)] text-[24px] font-bold text-ink">Tournament Summary</h1>
        <div className="rounded-[var(--radius-card)] border border-third-ink/20 bg-third-soft px-4 py-6 text-sm text-third-ink">
          Complete the knockout bracket to see the tournament summary.{' '}
          <Link href="/knockout" className="font-semibold text-navy hover:underline">
            Go to Knockout
          </Link>
        </div>
      </div>
    )
  }

  // Determine podium
  const finalMatch = knockoutMatches.find((m) => m.round === 'F')
  const thirdMatch = knockoutMatches.find((m) => m.round === '3RD')

  const firstId = champion
  const secondId = finalMatch
    ? finalMatch.homeTeamId === firstId
      ? finalMatch.awayTeamId
      : finalMatch.homeTeamId
    : null
  const thirdId = thirdMatch?.winnerId ?? null

  const firstTeam = firstId ? teamsMap[firstId] : null
  const secondTeam = secondId ? teamsMap[secondId] : null
  const thirdTeam = thirdId ? teamsMap[thirdId] : null

  // Tournament stats
  const completedGroupMatches = state.groupMatches.filter(
    (m) => m.homeScore !== null && m.awayScore !== null
  )
  const totalGoals = completedGroupMatches.reduce(
    (sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0),
    0
  )

  const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
  let highestGroupGoals = 0
  let highestScoringGroup: GroupId = 'A'
  for (const gid of groupIds) {
    const gMatches = completedGroupMatches.filter((m) => m.groupId === gid)
    const gGoals = gMatches.reduce(
      (sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0),
      0
    )
    if (gGoals > highestGroupGoals) {
      highestGroupGoals = gGoals
      highestScoringGroup = gid
    }
  }

  let topScorerTeamId: string | null = null
  let topScorerGoals = 0
  for (const gid of groupIds) {
    for (const s of groupStandings[gid]) {
      if (s.goalsFor > topScorerGoals) {
        topScorerGoals = s.goalsFor
        topScorerTeamId = s.teamId
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 animate-fadeIn">
      <div className="relative z-10">
        {/* Champion showcase */}
        <div className="mb-10 text-center">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
            FIFA World Cup 2026
          </p>
          <h1 className="mb-6 font-[family-name:var(--font-display)] text-[28px] font-bold tracking-tight text-ink sm:text-[36px]">
            World Champion
          </h1>

          <div className="mx-auto inline-block rounded-[var(--radius-card)] border border-line bg-card px-10 py-8">
            {firstTeam && (
              <div className="text-6xl leading-none">
                {flagEmoji(firstTeam.flagCode)}
              </div>
            )}
            <p className="mt-4 font-[family-name:var(--font-display)] text-[24px] font-bold text-ink sm:text-[28px]">
              {firstTeam?.name ?? firstId}
            </p>
          </div>
        </div>

        {/* Podium */}
        <div className="mb-10 flex items-end justify-center gap-3">
          {/* 2nd place - left */}
          <div className="flex w-28 flex-col items-center">
            <div className="w-full rounded-t-lg border border-line border-t-[3px] border-t-runner-ink bg-card px-3 pb-3 pt-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
                2nd
              </span>
              {secondTeam && (
                <div className="mt-2 text-2xl leading-none">
                  {flagEmoji(secondTeam.flagCode)}
                </div>
              )}
              <p className="mt-1 truncate text-xs font-semibold text-ink">
                {secondTeam?.name ?? 'TBD'}
              </p>
            </div>
            <div className="h-16 w-full rounded-b-sm bg-runner-soft" />
          </div>

          {/* 1st place - center, tallest */}
          <div className="flex w-32 flex-col items-center">
            <div className="w-full rounded-t-lg border border-line border-t-[3px] border-t-red bg-card px-3 pb-3 pt-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-red">
                Champion
              </span>
              {firstTeam && (
                <div className="mt-2 text-3xl leading-none">
                  {flagEmoji(firstTeam.flagCode)}
                </div>
              )}
              <p className="mt-1 truncate text-sm font-bold text-ink">
                {firstTeam?.name ?? firstId}
              </p>
            </div>
            <div className="h-24 w-full rounded-b-sm bg-red-soft" />
          </div>

          {/* 3rd place - right */}
          <div className="flex w-28 flex-col items-center">
            <div className="w-full rounded-t-lg border border-line border-t-[3px] border-t-third-ink bg-card px-3 pb-3 pt-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-third-ink">
                3rd
              </span>
              {thirdTeam && (
                <div className="mt-2 text-2xl leading-none">
                  {flagEmoji(thirdTeam.flagCode)}
                </div>
              )}
              <p className="mt-1 truncate text-xs font-semibold text-ink">
                {thirdTeam?.name ?? 'TBD'}
              </p>
            </div>
            <div className="h-12 w-full rounded-b-sm bg-third-soft" />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--radius-card)] border border-line bg-card p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
              Group Stage Goals
            </p>
            <p className="mt-1 text-2xl font-extrabold text-ink tabular-nums">{totalGoals}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-card p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
              Highest Scoring Group
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-ink">
              Group {highestScoringGroup}
            </p>
            <p className="text-xs text-muted tabular-nums">{highestGroupGoals} goals</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-card p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
              Top Scoring Team (Groups)
            </p>
            {topScorerTeamId ? (
              <>
                <div className="mt-1 flex justify-center">
                  <TeamBadge teamId={topScorerTeamId} size="sm" />
                </div>
                <p className="text-xs text-muted tabular-nums">{topScorerGoals} goals</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted">N/A</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <ResetButton
            label="Play Again"
            onConfirm={() => dispatch({ type: 'RESET_ALL' })}
            confirmMessage="Reset the entire tournament? All group scores and knockout picks will be cleared."
          />
          <Link
            href="/groups"
            className="inline-flex items-center rounded-[var(--radius-button)] border border-line bg-card px-4 py-2 text-sm font-medium text-muted transition-all hover:bg-paper hover:text-ink"
          >
            Review Groups
          </Link>
        </div>
      </div>
    </div>
  )
}
