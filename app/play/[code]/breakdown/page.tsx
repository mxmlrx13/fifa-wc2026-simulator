'use client'

import { use, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { groupFixtures } from '@/lib/data/fixtures'
import { bracketTemplate } from '@/lib/data/bracket-template'
import { teamsMap } from '@/lib/data/teams'
import {
  PREDICTION_ROUNDS,
  PREDICTION_ROUND_LABELS,
  PREDICTION_ROUND_RANGES,
  GROUP_MATCH_MAX_ID,
  CHAMPION_BONUS_MATCH_ID,
  type PredictionRoundKey,
} from '@/lib/constants'
import { useGame } from '@/lib/supabase/use-game'
import { gameFetch } from '@/lib/supabase/game-fetch'
import PointsChip from '@/components/ui/PointsChip'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScoreRow {
  match_id: number
  points: number
}

interface PredictionRow {
  match_id: number
  home_score: number | null
  away_score: number | null
  winner_id: string | null
}

interface OfficialResultRow {
  match_id: number
  home_score: number | null
  away_score: number | null
  winner_id: string | null
}

interface BreakdownData {
  scores: ScoreRow[]
  predictions: PredictionRow[]
  officialResults: OfficialResultRow[]
  championPick: string | null
  championBonus: number | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function flagEmoji(flagCode: string): string {
  if (flagCode === 'gb-eng') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'
  if (flagCode === 'gb-sct') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'
  if (flagCode === 'gb-wls') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}'
  const code = flagCode.toUpperCase()
  return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + 0x1F1A5))
}

function getMatchTeams(matchId: number): { homeId: string | null; awayId: string | null; isKnockout: boolean } {
  const groupMatch = groupFixtures.find((m) => m.id === matchId)
  if (groupMatch) {
    return { homeId: groupMatch.homeTeamId, awayId: groupMatch.awayTeamId, isKnockout: false }
  }
  const koMatch = bracketTemplate.find((m) => m.id === matchId)
  if (koMatch) {
    return { homeId: koMatch.homeTeamId ?? null, awayId: koMatch.awayTeamId ?? null, isKnockout: true }
  }
  return { homeId: null, awayId: null, isKnockout: matchId > GROUP_MATCH_MAX_ID }
}

function teamLabel(teamId: string | null): string {
  if (!teamId) return '???'
  const team = teamsMap[teamId]
  if (!team) return teamId
  return `${flagEmoji(team.flagCode)} ${team.id}`
}

function pointsTier(points: number): 'exact' | 'gd' | 'result' | 'zero' {
  if (points >= 5) return 'exact'
  if (points >= 3) return 'gd'
  if (points >= 1) return 'result'
  return 'zero'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BreakdownPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const { game, players, currentPlayer, rounds, loading: gameLoading } = useGame(code)

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [data, setData] = useState<BreakdownData | null>(null)
  const [dataLoading, setDataLoading] = useState(false)

  // Resolve the effective player ID (default to current player)
  const effectivePlayerId = selectedPlayerId ?? currentPlayer?.id ?? null

  // Determine which players are visible in the chip rail.
  const visiblePlayers = useMemo(() => {
    if (!currentPlayer) return []
    const hasScoredOrLocked = rounds.some((r) => r.status === 'scored' || r.status === 'locked')
    if (!hasScoredOrLocked) {
      return players.filter((p) => p.id === currentPlayer.id)
    }
    const sorted = [...players].sort((a, b) => {
      if (a.id === currentPlayer.id) return -1
      if (b.id === currentPlayer.id) return 1
      return 0
    })
    return sorted
  }, [players, currentPlayer, rounds])

  // Fetch breakdown data when effective player changes
  useEffect(() => {
    if (!effectivePlayerId) return
    let cancelled = false
    setDataLoading(true)

    const url = effectivePlayerId === currentPlayer?.id
      ? `/api/games/${code}/scores`
      : `/api/games/${code}/scores?playerId=${effectivePlayerId}`

    gameFetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })

    return () => { cancelled = true }
  }, [effectivePlayerId, code, currentPlayer?.id])

  // Group data by round
  const roundCards = useMemo(() => {
    if (!data) return []

    const scoreMap = new Map(data.scores.map((s) => [s.match_id, s.points]))
    const predMap = new Map(data.predictions.map((p) => [p.match_id, p]))
    const resultMap = new Map(data.officialResults.map((r) => [r.match_id, r]))

    const cards: {
      roundKey: PredictionRoundKey
      label: string
      subtotal: number
      matches: {
        matchId: number
        homeId: string | null
        awayId: string | null
        isKnockout: boolean
        prediction: PredictionRow | undefined
        officialResult: OfficialResultRow | undefined
        points: number | undefined
      }[]
    }[] = []

    for (const roundKey of PREDICTION_ROUNDS) {
      const [min, max] = PREDICTION_ROUND_RANGES[roundKey]
      const matches: typeof cards[0]['matches'] = []
      let subtotal = 0

      for (let matchId = min; matchId <= max; matchId++) {
        const pts = scoreMap.get(matchId)
        if (pts !== undefined) subtotal += pts

        const { homeId, awayId, isKnockout } = getMatchTeams(matchId)

        matches.push({
          matchId,
          homeId,
          awayId,
          isKnockout,
          prediction: predMap.get(matchId),
          officialResult: resultMap.get(matchId),
          points: pts,
        })
      }

      // Only show rounds that have at least one score or prediction
      const hasContent = matches.some((m) => m.points !== undefined || m.prediction || m.officialResult)
      if (hasContent) {
        cards.push({
          roundKey,
          label: PREDICTION_ROUND_LABELS[roundKey],
          subtotal,
          matches,
        })
      }
    }

    return cards
  }, [data])

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (gameLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton variant="card" className="mb-4" />
        <Skeleton variant="card" className="mb-4" />
        <Skeleton variant="card" />
      </div>
    )
  }

  if (!game || !currentPlayer) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm font-medium text-red">Game not found</p>
        <Link href="/play" className="text-[11px] text-muted hover:text-ink hover:underline">
          Back to multiplayer
        </Link>
      </div>
    )
  }

  const hasNoData = !dataLoading && data && data.scores.length === 0 && data.predictions.length === 0

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Back link */}
      <Link href={`/play/${code}`} className="mb-4 inline-block text-[11px] text-muted hover:text-ink">
        &larr; Dashboard
      </Link>

      {/* Title */}
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-[24px] font-bold text-ink">
        Breakdown
      </h1>

      {/* Desktop: sticky rail + grid  /  Mobile: scrollable chips + single column */}
      <div className="flex gap-6">
        {/* Desktop player rail */}
        <aside className="sticky top-8 hidden h-fit w-48 shrink-0 space-y-1 md:block">
          {visiblePlayers.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlayerId(p.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition-colors',
                effectivePlayerId === p.id
                  ? p.id === currentPlayer.id
                    ? 'bg-red-soft text-ink'
                    : 'bg-paper text-ink'
                  : 'text-muted hover:bg-paper hover:text-ink',
              )}
            >
              <span className="truncate">{p.displayName}</span>
              {p.id === currentPlayer.id && (
                <span className="ml-auto shrink-0 rounded bg-red-soft px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-red">
                  YOU
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Mobile player chips */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2 md:hidden">
            {visiblePlayers.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlayerId(p.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors',
                  effectivePlayerId === p.id
                    ? p.id === currentPlayer.id
                      ? 'bg-red-soft text-ink'
                      : 'bg-paper text-ink'
                    : 'bg-card text-muted',
                )}
              >
                {p.displayName}
                {p.id === currentPlayer.id && (
                  <span className="rounded bg-red-soft px-1 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-red">
                    YOU
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Loading indicator */}
          {dataLoading && (
            <div className="space-y-4">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          )}

          {/* Empty state */}
          {hasNoData && (
            <EmptyState
              label="No results yet"
              message="No results entered yet. Scores will appear after the host enters match results."
            />
          )}

          {/* Round cards */}
          {!dataLoading && data && !hasNoData && (
            <div className="grid gap-4 lg:grid-cols-2">
              {roundCards.map((card) => (
                <div
                  key={card.roundKey}
                  className="rounded-[var(--radius-card)] border border-line bg-card p-4"
                >
                  {/* Round header */}
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-[family-name:var(--font-display)] text-[17px] font-bold text-ink">
                      {card.label}
                    </h2>
                    <span className="font-[family-name:var(--font-display)] text-[17px] font-bold text-ink">
                      {card.subtotal}
                    </span>
                  </div>

                  {/* Match rows */}
                  <div className="divide-y divide-line">
                    {card.matches.map((match) => {
                      const hasResult = match.officialResult != null
                      const hasPrediction = match.prediction != null
                      const pts = match.points

                      // Determine tier
                      let tier: 'exact' | 'gd' | 'result' | 'zero' | 'pending' = 'pending'
                      if (pts !== undefined) {
                        tier = pointsTier(pts)
                      }

                      // Build tip/result text
                      let tipText = ''
                      if (match.isKnockout) {
                        const pickId = match.prediction?.winner_id
                        const resultId = match.officialResult?.winner_id
                        tipText = hasPrediction
                          ? `pick: ${pickId ?? '?'}`
                          : ''
                        if (hasResult && resultId) {
                          tipText += tipText ? ` \u00B7 result: ${resultId}` : `result: ${resultId}`
                        }
                      } else {
                        if (hasPrediction) {
                          tipText = `tip ${match.prediction!.home_score ?? '?'}:${match.prediction!.away_score ?? '?'}`
                        }
                        if (hasResult) {
                          const r = match.officialResult!
                          tipText += tipText
                            ? ` \u00B7 result ${r.home_score}:${r.away_score}`
                            : `result ${r.home_score}:${r.away_score}`
                        }
                      }

                      return (
                        <div key={match.matchId} className="flex items-center gap-2 py-2 text-[12.5px]">
                          {/* Fixture: flags + codes */}
                          <span className="shrink-0 font-medium text-ink">
                            {teamLabel(match.homeId)} – {teamLabel(match.awayId)}
                          </span>

                          {/* Tip / result */}
                          <span className="ml-auto truncate text-right text-muted">
                            {tipText}
                          </span>

                          {/* Points chip */}
                          <PointsChip tier={tier} className="ml-2 shrink-0">
                            {pts ?? 0}
                          </PointsChip>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Champion bonus card */}
              {data.championPick && (
                <div className="rounded-[var(--radius-card)] border border-line bg-card p-4 lg:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-[family-name:var(--font-display)] text-[17px] font-bold text-ink">
                      Champion Bonus
                    </h2>
                    {data.championBonus !== null && (
                      <span className="font-[family-name:var(--font-display)] text-[17px] font-bold text-ink">
                        {data.championBonus > 0 ? `+${data.championBonus}` : '0'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[12.5px]">
                    <span className="font-medium text-ink">
                      Pick: {teamLabel(data.championPick)}
                    </span>
                    {data.championBonus !== null ? (
                      <>
                        {/* Show the actual winner from official results */}
                        {(() => {
                          const bonusResult = data.officialResults.find(
                            (r) => r.match_id === CHAMPION_BONUS_MATCH_ID,
                          )
                          const actualWinner = bonusResult?.winner_id
                          return actualWinner ? (
                            <span className="text-muted">
                              {' '}&middot; result: {teamLabel(actualWinner)}
                            </span>
                          ) : null
                        })()}
                        <PointsChip
                          tier={data.championBonus > 0 ? 'exact' : 'zero'}
                          className="ml-auto shrink-0"
                        >
                          {data.championBonus > 0 ? `+${data.championBonus}` : '0'}
                        </PointsChip>
                      </>
                    ) : (
                      <PointsChip tier="pending" className="ml-auto shrink-0">
                        0
                      </PointsChip>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
