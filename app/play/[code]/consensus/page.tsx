'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useGame } from '@/lib/supabase/use-game'
import { gameFetch } from '@/lib/supabase/game-fetch'
import {
  computeChampionVotes,
  computeGroupWinnerConsensus,
  computeBoldestPicks,
  computePickSplits,
  type ChampionVote,
  type GroupWinnerConsensus,
  type BoldestPick,
  type PickSplit,
} from '@/lib/engine/consensus'
import { GROUP_MATCH_MAX_ID } from '@/lib/constants'
import { teamsMap } from '@/lib/data/teams'
import type { PredictionRoundKey } from '@/lib/constants'
import Skeleton from '@/components/ui/Skeleton'

function teamName(id: string) {
  return teamsMap[id]?.name ?? id
}

function flagUrl(id: string) {
  const code = teamsMap[id]?.flagCode
  if (!code) return undefined
  return `/flags/${code}.svg`
}

export default function ConsensusPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const { game, players, rounds, loading: gameLoading } = useGame(code)

  const [championVotes, setChampionVotes] = useState<ChampionVote[]>([])
  const [groupWinners, setGroupWinners] = useState<GroupWinnerConsensus[]>([])
  const [boldestPicks, setBoldestPicks] = useState<BoldestPick[]>([])
  const [pickSplits, setPickSplits] = useState<PickSplit[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  // Determine which rounds are locked/scored (visible)
  const visibleRounds = new Set(
    rounds
      .filter((r) => r.status === 'locked' || r.status === 'scored')
      .map((r) => r.roundKey),
  )
  const groupVisible = visibleRounds.has('group' as PredictionRoundKey)

  useEffect(() => {
    if (!game || !groupVisible || players.length === 0) return

    async function fetchData() {
      const res = await gameFetch(`/api/games/${code}/predictions`)
      if (!res.ok) return
      const data = await res.json()
      const predictions = data.predictions as Array<{
        player_id: string
        match_id: number
        home_score: number | null
        away_score: number | null
        winner_id: string | null
      }>

      const playerIds = players.map((p) => p.id)

      // Champion votes
      const votes = computeChampionVotes(
        players.map((p) => ({ id: p.id, championPick: p.championPick })),
      )
      setChampionVotes(votes)

      // Group winner consensus (only from group predictions)
      const groupPreds = predictions.filter((p) => p.match_id <= GROUP_MATCH_MAX_ID)
      setGroupWinners(computeGroupWinnerConsensus(groupPreds, playerIds))

      // Knockout predictions (only for visible/locked rounds)
      const koPreds = predictions.filter(
        (p) => p.match_id > GROUP_MATCH_MAX_ID && p.winner_id,
      )

      // Boldest picks
      setBoldestPicks(
        computeBoldestPicks(
          players.map((p) => ({
            id: p.id,
            displayName: p.displayName,
            championPick: p.championPick,
          })),
          koPreds,
        ),
      )

      // Pick splits for knockout
      if (koPreds.length > 0) {
        setPickSplits(computePickSplits(koPreds))
      }

      setDataLoaded(true)
    }
    fetchData()
  }, [game, groupVisible, players, code])

  if (gameLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Skeleton variant="card" />
      </div>
    )
  }

  if (!groupVisible) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link href={`/play/${code}`} className="mb-4 inline-block text-[11px] text-muted hover:text-ink">
          &larr; Dashboard
        </Link>
        <p className="text-sm text-muted">Group Pulse will be available once the group stage predictions are locked.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 animate-fadeIn">
      <Link href={`/play/${code}`} className="mb-4 inline-block text-[11px] text-muted hover:text-ink">
        &larr; Dashboard
      </Link>

      <h1 className="mb-8 font-[family-name:var(--font-display)] text-[24px] font-bold text-ink">
        Group Pulse
      </h1>

      {!dataLoaded ? (
        <div className="space-y-4">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Champion Votes */}
          {championVotes.length > 0 && (
            <section>
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
                Champion Picks
              </h2>
              <div className="rounded-[var(--radius-card)] border border-line bg-card p-4">
                <div className="space-y-2.5">
                  {championVotes.map((vote) => (
                    <ChampionVoteBar key={vote.teamId} vote={vote} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Group Winners */}
          {groupWinners.length > 0 && (
            <section>
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
                Predicted Group Winners
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {groupWinners.map((gw) => (
                  <div
                    key={gw.groupId}
                    className="flex items-center justify-between rounded-[var(--radius-card)] border border-line bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted">Group {gw.groupId}</span>
                      {flagUrl(gw.teamId) && (
                        <img src={flagUrl(gw.teamId)} alt="" className="h-4 w-5 rounded-sm object-cover" />
                      )}
                      <span className="text-sm font-bold text-ink">{teamName(gw.teamId)}</span>
                    </div>
                    <span className="text-[11px] tabular-nums text-muted">
                      {gw.count}/{gw.total}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Boldest Picks */}
          {boldestPicks.length > 0 && (
            <section>
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
                Boldest Picks
              </h2>
              <div className="rounded-[var(--radius-card)] border border-line bg-card p-4">
                <div className="space-y-2">
                  {boldestPicks.map((pick, i) => (
                    <div key={`${pick.playerId}-${pick.teamId}-${i}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink">{pick.displayName}</span>
                        <span className="rounded-[var(--radius-pill)] bg-red-soft px-2 py-0.5 text-[9px] font-bold uppercase text-red">
                          {pick.type === 'champion' ? 'Champion' : 'KO pick'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {flagUrl(pick.teamId) && (
                          <img src={flagUrl(pick.teamId)} alt="" className="h-3.5 w-4.5 rounded-sm object-cover" />
                        )}
                        <span className="text-sm font-bold text-ink">{teamName(pick.teamId)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Knockout Pick Splits */}
          {pickSplits.length > 0 && (
            <section>
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
                Knockout Pick Splits
              </h2>
              <div className="space-y-2">
                {pickSplits.map((split) => (
                  <div
                    key={split.matchId}
                    className="rounded-[var(--radius-card)] border border-line bg-card px-4 py-3"
                  >
                    <div className="mb-1 text-[10px] text-muted">Match {split.matchId}</div>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(split.teams)
                        .sort(([, a], [, b]) => b - a)
                        .map(([teamId, count]) => (
                          <div key={teamId} className="flex items-center gap-1.5">
                            {flagUrl(teamId) && (
                              <img src={flagUrl(teamId)} alt="" className="h-3.5 w-4.5 rounded-sm object-cover" />
                            )}
                            <span className="text-sm font-bold text-ink">{teamName(teamId)}</span>
                            <span className="text-[11px] tabular-nums text-muted">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function ChampionVoteBar({ vote }: { vote: ChampionVote }) {
  const pct = Math.round((vote.count / vote.total) * 100)

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {flagUrl(vote.teamId) && (
            <img src={flagUrl(vote.teamId)} alt="" className="h-3.5 w-4.5 rounded-sm object-cover" />
          )}
          <span className="text-sm font-semibold text-ink">{teamName(vote.teamId)}</span>
        </div>
        <span className="text-[11px] tabular-nums text-muted">
          {vote.count}/{vote.total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-paper">
        <div
          className="h-full rounded-full bg-navy transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
