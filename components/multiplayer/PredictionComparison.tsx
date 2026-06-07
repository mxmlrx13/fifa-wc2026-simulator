'use client'

import { useEffect, useState } from 'react'
import {
  PREDICTION_ROUND_LABELS,
  PREDICTION_ROUND_RANGES,
  type PredictionRoundKey,
} from '@/lib/constants'
import { groupFixtures } from '@/lib/data/fixtures'
import { bracketTemplate } from '@/lib/data/bracket-template'
import { teamsMap } from '@/lib/data/teams'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

interface Player {
  id: string
  displayName: string
}

interface Prediction {
  player_id: string
  match_id: number
  home_score: number | null
  away_score: number | null
  winner_id: string | null
}

interface PredictionComparisonProps {
  code: string
  round: PredictionRoundKey
  players: Player[]
  currentPlayerId?: string
}

function flagEmoji(flagCode: string): string {
  if (flagCode === 'gb-eng') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'
  if (flagCode === 'gb-sct') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'
  if (flagCode === 'gb-wls') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}'
  const code = flagCode.toUpperCase()
  return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + 0x1F1A5))
}

function getMatchTeams(matchId: number): { home: string; away: string } {
  const groupMatch = groupFixtures.find((m) => m.id === matchId)
  if (groupMatch) {
    return { home: groupMatch.homeTeamId, away: groupMatch.awayTeamId }
  }
  const koMatch = bracketTemplate.find((m) => m.id === matchId)
  if (koMatch) {
    return {
      home: koMatch.homeTeamId ?? koMatch.homeSlot,
      away: koMatch.awayTeamId ?? koMatch.awaySlot,
    }
  }
  return { home: '???', away: '???' }
}

function teamShort(teamId: string): string {
  const team = teamsMap[teamId]
  if (!team) return teamId
  return `${flagEmoji(team.flagCode)} ${team.id}`
}

export default function PredictionComparison({
  code,
  round,
  players,
  currentPlayerId,
}: PredictionComparisonProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch(`/api/games/${code}/predictions?round=${round}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setPredictions(data.predictions)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [code, round])

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton variant="row" />
        <Skeleton variant="row" />
        <Skeleton variant="row" />
      </div>
    )
  }

  const [min, max] = PREDICTION_ROUND_RANGES[round]
  const matchIds: number[] = []
  for (let i = min; i <= max; i++) matchIds.push(i)

  const isGroup = round === 'group'

  if (predictions.length === 0) {
    return (
      <EmptyState
        label="No predictions"
        message="No predictions available for this round yet."
      />
    )
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-line">
        <h3 className="font-[family-name:var(--font-display)] text-[17px] font-bold text-ink">
          {PREDICTION_ROUND_LABELS[round]}
        </h3>
      </div>
      {/* Horizontally scrollable with frozen first column */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-line bg-paper text-left text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
              <th className="sticky left-0 z-10 bg-paper px-3 py-2 min-w-[140px]">Match</th>
              {players.map((p) => (
                <th
                  key={p.id}
                  className={cn(
                    'px-3 py-2 text-center whitespace-nowrap min-w-[80px]',
                    p.id === currentPlayerId && 'text-red',
                  )}
                >
                  {p.displayName}
                  {p.id === currentPlayerId && (
                    <span className="ml-1 rounded-[5px] bg-red px-1 py-0.5 text-[7px] font-extrabold uppercase text-white">
                      YOU
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matchIds.map((matchId) => {
              const { home, away } = getMatchTeams(matchId)

              return (
                <tr key={matchId} className="border-b border-line">
                  <td className="sticky left-0 z-10 bg-card px-3 py-2 whitespace-nowrap">
                    <span className="font-semibold text-ink text-[11px]">
                      {teamShort(home)} – {teamShort(away)}
                    </span>
                  </td>
                  {players.map((p) => {
                    const pred = predictions.find(
                      (pr) => pr.player_id === p.id && pr.match_id === matchId,
                    )

                    if (!isGroup) {
                      // Knockout: show score + winner indicator
                      if (pred && pred.home_score !== null && pred.away_score !== null) {
                        const isTied = pred.home_score === pred.away_score
                        return (
                          <td key={p.id} className="px-3 py-2 text-center">
                            <span className="font-mono font-extrabold tabular-nums text-[12px]">
                              {pred.home_score}-{pred.away_score}
                            </span>
                            {pred.winner_id && (
                              <span className="ml-1 text-[9px] font-bold text-navy">
                                {isTied ? `(${pred.winner_id})` : ''}
                              </span>
                            )}
                          </td>
                        )
                      }
                      return (
                        <td key={p.id} className="px-3 py-2 text-center">
                          <span className="text-muted">&ndash;</span>
                        </td>
                      )
                    }

                    return (
                      <td key={p.id} className="px-3 py-2 text-center">
                        {pred && pred.home_score !== null && pred.away_score !== null ? (
                          <span className="font-mono font-extrabold tabular-nums text-[12px]">
                            {pred.home_score}-{pred.away_score}
                          </span>
                        ) : (
                          <span className="text-muted">&ndash;</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
