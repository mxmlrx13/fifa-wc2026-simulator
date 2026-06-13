'use client'

import { useState, useEffect } from 'react'
import { teamsMap } from '@/lib/data/teams'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MatchPrediction {
  playerId: string
  homeScore: number | null
  awayScore: number | null
  winnerId: string | null
  points: number | null
}

interface MatchEntry {
  matchId: number
  homeTeamId: string | null
  awayTeamId: string | null
  groupId: string | null
  kickoffUtc: string | null
  venue: string | null
  result: {
    homeScore: number | null
    awayScore: number | null
    winnerId: string | null
  } | null
  predictions: MatchPrediction[]
}

interface PlayerInfo {
  id: string
  displayName: string
  isCurrentUser: boolean
}

interface MatchDayData {
  today: MatchEntry[]
  recent: MatchEntry[]
  players: PlayerInfo[]
  currentPlayerId: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function flagEmoji(flagCode: string): string {
  if (flagCode === 'gb-eng') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'
  if (flagCode === 'gb-sct') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'
  if (flagCode === 'gb-wls') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}'
  const code = flagCode.toUpperCase()
  return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + 0x1F1A5))
}

function teamBadge(teamId: string | null): string {
  if (!teamId) return '???'
  const team = teamsMap[teamId]
  if (!team) return teamId
  return `${flagEmoji(team.flagCode)} ${team.id}`
}

function formatKickoff(utcStr: string): string {
  const d = new Date(utcStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function pointsBg(pts: number | null): string {
  if (pts === null) return 'bg-out-soft text-muted'
  if (pts >= 5) return 'bg-win-soft text-win-ink'
  if (pts >= 3) return 'bg-third-soft text-third-ink'
  if (pts >= 1) return 'bg-badge-locked-bg text-badge-locked-ink'
  return 'bg-out-soft text-muted'
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MatchRow({
  match,
  players,
  currentPlayerId,
  showResult,
}: {
  match: MatchEntry
  players: PlayerInfo[]
  currentPlayerId: string
  showResult: boolean
}) {
  const currentPred = match.predictions.find((p) => p.playerId === currentPlayerId)

  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2.5">
      {/* Match header: teams + score/time */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
          <span>{teamBadge(match.homeTeamId)}</span>
          <span className="text-muted">–</span>
          <span>{teamBadge(match.awayTeamId)}</span>
        </div>

        {showResult && match.result ? (
          <span className="rounded-md bg-navy px-2 py-0.5 text-[12px] font-bold tabular-nums text-paper">
            {match.result.homeScore} – {match.result.awayScore}
          </span>
        ) : match.kickoffUtc ? (
          <span className="text-[11px] font-medium tabular-nums text-muted">
            {formatKickoff(match.kickoffUtc)}
          </span>
        ) : null}

        {match.groupId && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted">
            Gr. {match.groupId}
          </span>
        )}
      </div>

      {/* Predictions grid */}
      <div className="mt-2 space-y-0.5">
        {players.map((player) => {
          const pred = match.predictions.find((p) => p.playerId === player.id)
          if (!pred || pred.homeScore === null) return null

          return (
            <div key={player.id} className="flex items-center gap-2 text-[11px]">
              <span className={cn(
                'w-16 truncate',
                player.isCurrentUser ? 'font-bold text-ink' : 'text-muted',
              )}>
                {player.isCurrentUser ? 'You' : player.displayName}
              </span>
              <span className="tabular-nums text-muted">
                {pred.homeScore}:{pred.awayScore}
              </span>
              {pred.points !== null && (
                <span className={cn(
                  'ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                  pointsBg(pred.points),
                )}>
                  {pred.points}
                </span>
              )}
            </div>
          )
        })}
        {/* If current user has no prediction for upcoming */}
        {!currentPred && !showResult && (
          <p className="text-[10px] italic text-muted">No prediction yet</p>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MatchDayCard({ code }: { code: string }) {
  const [data, setData] = useState<MatchDayData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/games/${code}/matchday`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [code])

  if (loading || !data) return null
  if (data.today.length === 0 && data.recent.length === 0) return null

  // Sort players: current user first
  const sortedPlayers = [...data.players].sort((a, b) => {
    if (a.isCurrentUser) return -1
    if (b.isCurrentUser) return 1
    return 0
  })

  return (
    <div className="mb-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent results */}
        {data.recent.length > 0 && (
          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
              Recent Results
            </h3>
            <div className="space-y-2">
              {data.recent.map((match) => (
                <MatchRow
                  key={match.matchId}
                  match={match}
                  players={sortedPlayers}
                  currentPlayerId={data.currentPlayerId}
                  showResult
                />
              ))}
            </div>
          </div>
        )}

        {/* Today's matches */}
        {data.today.length > 0 && (
          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
              Today&apos;s Matches
            </h3>
            <div className="space-y-2">
              {data.today.map((match) => (
                <MatchRow
                  key={match.matchId}
                  match={match}
                  players={sortedPlayers}
                  currentPlayerId={data.currentPlayerId}
                  showResult={!!match.result}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
