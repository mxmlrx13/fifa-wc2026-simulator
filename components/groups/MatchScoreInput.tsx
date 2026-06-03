'use client'

import { useCallback, useState, useEffect } from 'react'
import type { GroupMatch } from '@/lib/types'
import type { TournamentAction } from '@/lib/store'
import { teamsMap } from '@/lib/data/teams'
import ScoreInput from '@/components/shared/ScoreInput'
import { cn } from '@/lib/utils'

interface MatchScoreInputProps {
  match: GroupMatch
  dispatch: React.Dispatch<TournamentAction>
}

function flagEmoji(flagCode: string): string {
  if (flagCode === 'gb-eng') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'
  if (flagCode === 'gb-sct') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'
  if (flagCode === 'gb-wls') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}'
  const code = flagCode.toUpperCase()
  return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + 0x1F1A5))
}

export default function MatchScoreInput({ match, dispatch }: MatchScoreInputProps) {
  const [homeScore, setHomeScore] = useState<number | null>(match.homeScore)
  const [awayScore, setAwayScore] = useState<number | null>(match.awayScore)

  useEffect(() => {
    setHomeScore(match.homeScore)
    setAwayScore(match.awayScore)
  }, [match.homeScore, match.awayScore])

  const dispatchIfComplete = useCallback(
    (home: number | null, away: number | null) => {
      if (home !== null && away !== null) {
        dispatch({
          type: 'SET_MATCH_SCORE',
          matchId: match.id,
          homeScore: home,
          awayScore: away,
        })
      }
    },
    [dispatch, match.id]
  )

  const homeTeam = teamsMap[match.homeTeamId]
  const awayTeam = teamsMap[match.awayTeamId]
  const isComplete = homeScore !== null && awayScore !== null
  const homeWins = isComplete && homeScore! > awayScore!
  const awayWins = isComplete && awayScore! > homeScore!
  const isDraw = isComplete && homeScore === awayScore

  return (
    <div className={cn(
      'flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition-all',
      isComplete ? 'bg-gray-50' : 'bg-transparent'
    )}>
      {/* Home team */}
      <div className={cn(
        'flex min-w-0 flex-1 items-center justify-end gap-1.5 text-right',
        isComplete && !homeWins && !isDraw && 'opacity-50'
      )}>
        <span className="truncate text-xs font-semibold">{homeTeam?.id ?? '???'}</span>
        <span className="text-base leading-none">{homeTeam ? flagEmoji(homeTeam.flagCode) : ''}</span>
      </div>

      {/* Score */}
      <div className="flex items-center gap-1.5">
        <ScoreInput
          value={homeScore}
          onChange={(v) => {
            setHomeScore(v)
            dispatchIfComplete(v, awayScore)
          }}
        />
        <span className={cn(
          'text-xs font-bold',
          isDraw ? 'text-accent' : 'text-gray-400'
        )}>
          {isComplete ? (isDraw ? '=' : '-') : '-'}
        </span>
        <ScoreInput
          value={awayScore}
          onChange={(v) => {
            setAwayScore(v)
            dispatchIfComplete(homeScore, v)
          }}
        />
      </div>

      {/* Away team */}
      <div className={cn(
        'flex min-w-0 flex-1 items-center gap-1.5',
        isComplete && !awayWins && !isDraw && 'opacity-50'
      )}>
        <span className="text-base leading-none">{awayTeam ? flagEmoji(awayTeam.flagCode) : ''}</span>
        <span className="truncate text-xs font-semibold">{awayTeam?.id ?? '???'}</span>
      </div>
    </div>
  )
}
