'use client'

import { useEffect, useState } from 'react'
import { getMatchIdsForRound, getRoundLabel, isGroupRound, type RoundKey } from '@/lib/engine/rounds'
import { groupFixtures } from '@/lib/data/fixtures'
import { bracketTemplate } from '@/lib/data/bracket-template'
import { teamsMap } from '@/lib/data/teams'
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
  round: RoundKey
  players: Player[]
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

export default function PredictionComparison({
  code,
  round,
  players,
}: PredictionComparisonProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    async function load() {
      const res = await fetch(`/api/games/${code}/predictions?round=${round}`)
      if (res.ok) {
        const data = await res.json()
        setPredictions(data.predictions)
      }
      setLoading(false)
    }
    load()
  }, [code, round])

  if (loading) {
    return <div className="text-center text-xs text-gray-500">Loading...</div>
  }

  const matchIds = getMatchIdsForRound(round)
  const isGroup = isGroupRound(round)

  return (
    <div className="glass-card overflow-x-auto">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-bold text-accent">{getRoundLabel(round)}</h3>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-[10px] uppercase tracking-wider text-gray-500">
            <th className="px-3 py-2 sticky left-0 bg-card">Match</th>
            {players.map((p) => (
              <th key={p.id} className="px-3 py-2 text-center">{p.displayName}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matchIds.map((matchId) => {
            const { home, away } = getMatchTeams(matchId)
            const homeTeam = teamsMap[home]
            const awayTeam = teamsMap[away]

            return (
              <tr key={matchId} className="border-b border-gray-200">
                <td className="px-3 py-2 sticky left-0 bg-card whitespace-nowrap">
                  <span className="font-medium">
                    {homeTeam?.id ?? home} vs {awayTeam?.id ?? away}
                  </span>
                </td>
                {players.map((p) => {
                  const pred = predictions.find(
                    (pr) => pr.player_id === p.id && pr.match_id === matchId,
                  )

                  if (!isGroup && pred?.winner_id) {
                    return (
                      <td key={p.id} className="px-3 py-2 text-center">
                        <span className="font-mono font-bold text-accent">
                          {pred.winner_id}
                        </span>
                      </td>
                    )
                  }

                  return (
                    <td key={p.id} className="px-3 py-2 text-center">
                      {pred && pred.home_score !== null && pred.away_score !== null ? (
                        <span className="font-mono font-bold">
                          {pred.home_score}-{pred.away_score}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
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
  )
}
