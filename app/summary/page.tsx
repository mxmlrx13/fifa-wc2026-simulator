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
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Tournament Summary</h1>
        <div className="glass-card rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-6 text-sm text-amber-700">
          Complete the knockout bracket to see the tournament summary.{' '}
          <Link href="/knockout" className="font-semibold text-accent hover:underline">
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
      {/* Decorative orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-accent/5 blur-[140px]" />
      </div>

      <div className="relative z-10">
        {/* Champion showcase */}
        <div className="mb-10 text-center">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
            FIFA World Cup 2026
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-accent sm:text-5xl">
            WORLD CHAMPION
          </h1>

          <div className="glass-card glow-accent mx-auto inline-block rounded-2xl px-10 py-8">
            {firstTeam && (
              <div className="text-6xl leading-none">
                {flagEmoji(firstTeam.flagCode)}
              </div>
            )}
            <p className="mt-4 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              {firstTeam?.name ?? firstId}
            </p>
          </div>
        </div>

        {/* Podium */}
        <div className="mb-10 flex items-end justify-center gap-3">
          {/* 2nd place - left */}
          <div className="flex w-28 flex-col items-center">
            <div className="glass-card w-full rounded-t-lg border-t-2 border-t-slate-400 px-3 pb-3 pt-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                2nd
              </span>
              {secondTeam && (
                <div className="mt-2 text-2xl leading-none">
                  {flagEmoji(secondTeam.flagCode)}
                </div>
              )}
              <p className="mt-1 truncate text-xs font-semibold text-gray-700">
                {secondTeam?.name ?? 'TBD'}
              </p>
            </div>
            <div className="h-16 w-full rounded-b-sm bg-gradient-to-b from-slate-600/30 to-slate-700/20" />
          </div>

          {/* 1st place - center, tallest */}
          <div className="flex w-32 flex-col items-center">
            <div className="glass-card glow-accent w-full rounded-t-lg border-t-2 border-t-accent px-3 pb-3 pt-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                Champion
              </span>
              {firstTeam && (
                <div className="mt-2 text-3xl leading-none">
                  {flagEmoji(firstTeam.flagCode)}
                </div>
              )}
              <p className="mt-1 truncate text-sm font-bold text-gray-900">
                {firstTeam?.name ?? firstId}
              </p>
            </div>
            <div className="h-24 w-full rounded-b-sm bg-gradient-to-b from-accent/20 to-accent/5" />
          </div>

          {/* 3rd place - right */}
          <div className="flex w-28 flex-col items-center">
            <div className="glass-card w-full rounded-t-lg border-t-2 border-t-amber-600 px-3 pb-3 pt-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                3rd
              </span>
              {thirdTeam && (
                <div className="mt-2 text-2xl leading-none">
                  {flagEmoji(thirdTeam.flagCode)}
                </div>
              )}
              <p className="mt-1 truncate text-xs font-semibold text-gray-700">
                {thirdTeam?.name ?? 'TBD'}
              </p>
            </div>
            <div className="h-12 w-full rounded-b-sm bg-gradient-to-b from-amber-700/20 to-amber-800/10" />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="glass-card p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Group Stage Goals
            </p>
            <p className="mt-1 text-2xl font-bold text-accent">{totalGoals}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Highest Scoring Group
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              Group {highestScoringGroup}
            </p>
            <p className="text-xs text-gray-500">{highestGroupGoals} goals</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Top Scoring Team (Groups)
            </p>
            {topScorerTeamId ? (
              <>
                <div className="mt-1 flex justify-center">
                  <TeamBadge teamId={topScorerTeamId} size="sm" />
                </div>
                <p className="text-xs text-gray-500">{topScorerGoals} goals</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-gray-400">N/A</p>
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
            className="glass-card rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900"
          >
            Review Groups
          </Link>
        </div>
      </div>
    </div>
  )
}
