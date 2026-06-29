'use client'

import { use, useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useGame, type GameRound } from '@/lib/supabase/use-game'
import { gameFetch } from '@/lib/supabase/game-fetch'
import type { GroupId, TournamentState, KnockoutMatch } from '@/lib/types'
import { useTournament } from '@/lib/store'
import { hydratePredictions } from '@/lib/supabase/hydrate-predictions'
import { teamsMap } from '@/lib/data/teams'
import {
  PREDICTION_ROUND_LABELS,
  PREDICTION_ROUND_RANGES,
  GROUP_MATCH_MAX_ID,
  THIRD_PLACE_MATCH_ID,
  FINAL_MATCH_ID,
  getKnockoutPointsForMatch,
  type PredictionRoundKey,
} from '@/lib/constants'
import PredictionProvider from '@/components/multiplayer/PredictionProvider'
import { quickFillGroupMatches, quickFillKnockoutPicks, type KnockoutPrediction } from '@/lib/engine/quick-fill'
import GroupCard from '@/components/groups/GroupCard'
import ScoreInput from '@/components/shared/ScoreInput'
import GroupStandingsTable from '@/components/groups/GroupStandingsTable'
import ChampionPicker from '@/components/multiplayer/ChampionPicker'
import ThirdPlaceTable from '@/components/standings/ThirdPlaceTable'
import QualifiedTeamsGrid from '@/components/standings/QualifiedTeamsGrid'
import SavePill from '@/components/ui/SavePill'
import PointsChip from '@/components/ui/PointsChip'
import Skeleton from '@/components/ui/Skeleton'
import { useAutoSave } from '@/lib/hooks/use-auto-save'
import { CountdownBadgeInline } from '@/components/ui/CountdownBadge'
import {
  DEADLINE_ENFORCEMENT_ENABLED,
  getPredictionRoundDeadline,
} from '@/lib/data/schedule'
import { cn } from '@/lib/utils'

const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

// ─── Group Phase Inner ──────────────────────────────────────────────────────

type GroupTab = 'groups' | 'standings' | 'champion'

function GroupPhaseInner({
  championPick,
  onChampionPick,
  readOnly,
  onQuickFill,
}: {
  championPick: string | null
  onChampionPick: (teamId: string) => void
  readOnly: boolean
  onQuickFill?: () => void
}) {
  const { state, groupStandings, thirdPlaceResults } = useTournament()
  const [activeTab, setActiveTab] = useState<GroupTab>('groups')

  const completedGroupMatches = state.groupMatches.filter(
    (m) => m.homeScore !== null && m.awayScore !== null,
  ).length
  const totalGroupMatches = state.groupMatches.length
  const remaining = totalGroupMatches - completedGroupMatches

  const tabs: { key: GroupTab; label: string }[] = [
    { key: 'groups', label: 'Groups' },
    { key: 'standings', label: 'Standings' },
    { key: 'champion', label: 'Champion' },
  ]

  return (
    <>
      {/* Completion meter */}
      <div className="mb-4 rounded-[var(--radius-card)] border border-line bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
            Group Predictions
          </span>
          <span className="text-xs font-extrabold tabular-nums text-ink">
            {completedGroupMatches}/{totalGroupMatches}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-line overflow-hidden">
          <div
            className="h-full rounded-full bg-red transition-all duration-500"
            style={{ width: `${(completedGroupMatches / totalGroupMatches) * 100}%` }}
          />
        </div>
        {!readOnly && remaining > 0 && onQuickFill && (
          <button
            type="button"
            onClick={onQuickFill}
            className="mt-2 w-full rounded-[var(--radius-button)] border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink transition-all hover:bg-card"
          >
            Quick-fill remaining ({remaining})
          </button>
        )}
        {championPick && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
            <span>Champion:</span>
            <span className="font-bold text-ink">{teamsMap[championPick]?.name ?? championPick}</span>
          </div>
        )}
      </div>

      {/* Inline tabs */}
      <div className="mb-6 flex gap-1 rounded-[var(--radius-card)] border border-line bg-paper p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 rounded-[var(--radius-input)] px-3 py-2 text-xs font-bold transition-all',
              activeTab === tab.key
                ? 'bg-card text-navy border border-line'
                : 'text-muted hover:text-ink border border-transparent',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Groups tab */}
      {activeTab === 'groups' && (
        <div className="animate-fadeIn">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupIds.map((id) => (
              <GroupCard key={id} groupId={id} />
            ))}
          </div>
        </div>
      )}

      {/* Standings tab — always rendered from partial predictions */}
      {activeTab === 'standings' && (
        <div className="animate-fadeIn">
          <p className="mb-4 text-[11px] text-muted">
            Based on {completedGroupMatches}/{totalGroupMatches} predictions
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupIds.map((gid) => (
              <div key={gid} className="rounded-[var(--radius-card)] border border-line bg-card p-3">
                <h3 className="mb-2 font-[family-name:var(--font-display)] text-[17px] font-bold text-ink">
                  Group {gid}
                </h3>
                <GroupStandingsTable standings={groupStandings[gid]} condensed />
              </div>
            ))}
          </div>

          {/* Best third-placed teams */}
          {thirdPlaceResults.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
                Best third-placed teams
              </h2>
              <ThirdPlaceTable results={thirdPlaceResults} />
              <p className="mt-2 text-[10px] text-muted">
                Ranked by points, goal difference, goals scored, then FIFA ranking (team conduct is not trackable here).
              </p>
            </section>
          )}

          {/* Qualified for the knockouts */}
          {completedGroupMatches > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
                Qualified for the knockouts
              </h2>
              <div className="rounded-[var(--radius-card)] border border-line bg-card p-4">
                <QualifiedTeamsGrid
                  groupStandings={groupStandings}
                  thirdPlaceResults={thirdPlaceResults}
                />
              </div>
            </section>
          )}
        </div>
      )}

      {/* Champion tab */}
      {activeTab === 'champion' && (
        <div className="animate-fadeIn">
          <p className="mb-4 text-[13.5px] text-muted">
            Pick the team you think will win the 2026 FIFA World Cup. Worth 10 bonus points if correct.
          </p>
          <ChampionPicker
            selected={championPick}
            onPick={onChampionPick}
            readOnly={readOnly}
          />
        </div>
      )}
    </>
  )
}

// ─── Knockout Phase Inner ───────────────────────────────────────────────────

function flagEmoji(flagCode: string): string {
  if (flagCode === 'gb-eng') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'
  if (flagCode === 'gb-sct') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'
  if (flagCode === 'gb-wls') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}'
  const code = flagCode.toUpperCase()
  return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + 0x1F1A5))
}

interface KnockoutFixture {
  matchId: number
  homeTeamId: string | null
  awayTeamId: string | null
  homeSlot: string
  awaySlot: string
  round: string
}

function KnockoutPhaseInner({
  rounds,
  activeRound,
  fixtures,
  picks,
  onScoreChange,
  onShootoutPick,
  readOnly,
  scoredMatchPoints,
  onQuickFill,
}: {
  rounds: GameRound[]
  activeRound: PredictionRoundKey
  fixtures: KnockoutFixture[]
  picks: Record<number, KnockoutPrediction>
  onScoreChange: (matchId: number, side: 'home' | 'away', value: number | null) => void
  onShootoutPick: (matchId: number, winnerId: string) => void
  readOnly: boolean
  scoredMatchPoints?: Map<number, number>
  onQuickFill?: () => void
}) {
  const [selectedRound, setSelectedRound] = useState<PredictionRoundKey>(activeRound)

  const koRounds: PredictionRoundKey[] = ['r32', 'r16', 'qf', 'sf', 'final']

  const roundStatus = (rk: PredictionRoundKey) =>
    rounds.find((r) => r.roundKey === rk)?.status ?? 'pending'

  const [min, max] = PREDICTION_ROUND_RANGES[selectedRound]
  const roundFixtures = fixtures.filter((f) => f.matchId >= min && f.matchId <= max)
  const isRoundOpen = roundStatus(selectedRound) === 'open'

  // A pick is "complete" when it has a winnerId (derived from non-tied score, or shootout pick)
  const pickCount = Object.entries(picks).filter(([id, p]) => {
    const n = Number(id)
    return n >= min && n <= max && p.winnerId
  }).length

  // Count tied matches without shootout pick (pending resolution)
  const pendingShootouts = roundFixtures.filter((f) => {
    const p = picks[f.matchId]
    return p && p.homeScore !== null && p.awayScore !== null &&
      p.homeScore === p.awayScore && !p.winnerId
  }).length

  return (
    <>
      {/* Round pills */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {koRounds.map((rk) => {
          const st = roundStatus(rk)
          const label = PREDICTION_ROUND_LABELS[rk]
          return (
            <button
              key={rk}
              onClick={() => setSelectedRound(rk)}
              disabled={st === 'pending'}
              className={cn(
                'rounded-[var(--radius-pill)] px-3 py-1.5 text-xs font-bold transition-all',
                selectedRound === rk && st === 'open' && 'bg-navy text-paper',
                selectedRound === rk && st !== 'open' && 'bg-card border border-line text-ink',
                selectedRound !== rk && st === 'open' && 'bg-card border border-line text-navy',
                selectedRound !== rk && st === 'scored' && 'bg-win-soft text-win-ink',
                selectedRound !== rk && st === 'locked' && 'bg-badge-locked-bg text-badge-locked-ink',
                selectedRound !== rk && st === 'pending' && 'bg-out-soft text-muted opacity-50',
              )}
            >
              {label}
              {st === 'scored' && ' \u2713'}
            </button>
          )
        })}
      </div>

      {/* Pick count + quick-fill */}
      <div className="mb-4 flex items-center gap-3">
        <p className="text-[11px] text-muted tabular-nums">
          {pickCount}/{roundFixtures.length} picks
          {isRoundOpen && (
            <span className="ml-2 text-navy">
              ({getKnockoutPointsForMatch(min)} pts · exact +2)
            </span>
          )}
          {pendingShootouts > 0 && (
            <span className="ml-2 text-red">
              ({pendingShootouts} need{pendingShootouts === 1 ? 's' : ''} shootout pick)
            </span>
          )}
        </p>
        {isRoundOpen && !readOnly && pickCount < roundFixtures.length && onQuickFill && (
          <button
            type="button"
            onClick={onQuickFill}
            className="rounded-[var(--radius-button)] border border-line bg-paper px-2.5 py-1 text-[10px] font-semibold text-ink transition-all hover:bg-card"
          >
            Quick-fill remaining
          </button>
        )}
      </div>

      {/* Fixture cards */}
      <div className="space-y-2">
        {roundFixtures.map((fixture) => {
          const homeTeam = fixture.homeTeamId ? teamsMap[fixture.homeTeamId] : null
          const awayTeam = fixture.awayTeamId ? teamsMap[fixture.awayTeamId] : null
          const canEdit = isRoundOpen && !readOnly && homeTeam !== null && awayTeam !== null
          const pick = picks[fixture.matchId]
          const homeScore = pick?.homeScore ?? null
          const awayScore = pick?.awayScore ?? null
          const winnerId = pick?.winnerId ?? null
          const isTied = homeScore !== null && awayScore !== null && homeScore === awayScore
          const hasScores = homeScore !== null && awayScore !== null
          const isComplete = hasScores && winnerId !== null

          // Scored state
          const matchPoints = scoredMatchPoints?.get(fixture.matchId)
          const isScored = matchPoints !== undefined

          const distinctLabel =
            fixture.matchId === THIRD_PLACE_MATCH_ID
              ? 'Third-place match'
              : fixture.matchId === FINAL_MATCH_ID
                ? 'Final'
                : null

          return (
            <div key={fixture.matchId}>
              {distinctLabel && (
                <p className="mt-4 mb-1 text-[10px] font-bold uppercase tracking-[0.09em] text-navy">
                  {distinctLabel}
                </p>
              )}
              <div className={cn(
                'rounded-[var(--radius-card)] border overflow-hidden transition-all',
                isComplete ? 'border-red-line' : isTied && hasScores ? 'border-red/50' : 'border-line',
              )}>
                {/* Match label */}
                <div className="border-b border-line bg-paper px-3 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
                  M{fixture.matchId}
                  {isScored && matchPoints !== undefined && (
                    <span className="float-right">
                      <PointsChip tier={matchPoints >= 5 ? 'exact' : matchPoints > 0 ? 'gd' : 'zero'}>
                        {matchPoints}
                      </PointsChip>
                    </span>
                  )}
                </div>

                {/* Score row */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  {/* Home team */}
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-right">
                    {homeTeam ? (
                      <>
                        <span className="truncate text-xs font-bold">{homeTeam.id}</span>
                        <span className="text-base leading-none">{flagEmoji(homeTeam.flagCode)}</span>
                      </>
                    ) : (
                      <span className="text-[10px] italic text-muted">{slotLabel(fixture.homeSlot)}</span>
                    )}
                  </div>

                  {/* Score inputs */}
                  <div className="flex items-center gap-1.5">
                    {canEdit ? (
                      <>
                        <ScoreInput
                          value={homeScore}
                          onChange={(v) => onScoreChange(fixture.matchId, 'home', v)}
                        />
                        <span className="text-xs font-bold text-muted">-</span>
                        <ScoreInput
                          value={awayScore}
                          onChange={(v) => onScoreChange(fixture.matchId, 'away', v)}
                        />
                      </>
                    ) : (
                      <span className="px-2 text-sm font-extrabold tabular-nums text-ink">
                        {homeScore ?? '–'} - {awayScore ?? '–'}
                      </span>
                    )}
                  </div>

                  {/* Away team */}
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    {awayTeam ? (
                      <>
                        <span className="text-base leading-none">{flagEmoji(awayTeam.flagCode)}</span>
                        <span className="truncate text-xs font-bold">{awayTeam.id}</span>
                      </>
                    ) : (
                      <span className="text-[10px] italic text-muted">{slotLabel(fixture.awaySlot)}</span>
                    )}
                  </div>

                  {/* Winner indicator (non-tied) */}
                  {hasScores && !isTied && winnerId && (
                    <span className="text-xs text-red">{'\u2713'}</span>
                  )}
                </div>

                {/* Shootout picker — appears when scores are tied */}
                {isTied && homeTeam && awayTeam && (
                  <div className={cn(
                    'border-t border-line px-3 py-2',
                    !winnerId ? 'bg-red-soft/30' : 'bg-paper',
                  )}>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={cn(
                        'font-semibold',
                        !winnerId ? 'text-red' : 'text-muted',
                      )}>
                        {canEdit ? (winnerId ? 'Shootout:' : 'Pick shootout winner:') : 'Shootout:'}
                      </span>
                      {canEdit ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onShootoutPick(fixture.matchId, homeTeam.id)}
                            className={cn(
                              'rounded px-2 py-0.5 font-bold transition-all',
                              winnerId === homeTeam.id ? 'bg-navy text-paper' : 'bg-out-soft hover:bg-line',
                            )}
                          >
                            {homeTeam.id}
                          </button>
                          <button
                            type="button"
                            onClick={() => onShootoutPick(fixture.matchId, awayTeam.id)}
                            className={cn(
                              'rounded px-2 py-0.5 font-bold transition-all',
                              winnerId === awayTeam.id ? 'bg-navy text-paper' : 'bg-out-soft hover:bg-line',
                            )}
                          >
                            {awayTeam.id}
                          </button>
                        </>
                      ) : winnerId ? (
                        <span className="font-bold text-ink">{winnerId}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function slotLabel(slot: string): string {
  if (slot.startsWith('W')) return `Winner M${slot.slice(1)}`
  if (slot.startsWith('L')) return `Loser M${slot.slice(1)}`
  if (slot.startsWith('3{')) return `3rd ${slot.slice(1)}`
  if (slot.startsWith('1')) return `1st Gr.${slot.slice(1)}`
  if (slot.startsWith('2')) return `2nd Gr.${slot.slice(1)}`
  return slot
}

// ─── Main Page ──────────────────────────────────────────────────────────────

function PredictInner({
  code,
  rounds,
  currentChampionPick,
  currentPlayerId,
}: {
  code: string
  rounds: GameRound[]
  currentChampionPick: string | null
  currentPlayerId: string
}) {
  const { state, dispatch } = useTournament()
  const stateRef = useRef(state)
  const [showQuickFillBanner, setShowQuickFillBanner] = useState(false)
  const championPickRef = useRef(currentChampionPick)
  const knockoutPicksRef = useRef<Record<number, KnockoutPrediction>>({})

  const [championPick, setChampionPick] = useState<string | null>(currentChampionPick)
  const [knockoutFixtures, setKnockoutFixtures] = useState<KnockoutFixture[]>([])
  const [knockoutPicks, setKnockoutPicks] = useState<Record<number, KnockoutPrediction>>({})
  const [scoredMatchPoints, setScoredMatchPoints] = useState<Map<number, number>>(new Map())

  // Keep refs in sync via effects
  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { championPickRef.current = championPick }, [championPick])
  useEffect(() => { knockoutPicksRef.current = knockoutPicks }, [knockoutPicks])

  // Auto-save — declared before handlers so they can call markDirty
  const { status: saveStatus, markDirty, retry } = useAutoSave({
    debounceMs: 1500,
    onSave: async () => {
      const s = stateRef.current
      const currentKoPicks = knockoutPicksRef.current

      const predictions: Array<{
        matchId: number
        homeScore?: number
        awayScore?: number
        winnerId?: string
      }> = []

      for (const m of s.groupMatches) {
        if (m.homeScore !== null && m.awayScore !== null) {
          predictions.push({ matchId: m.id, homeScore: m.homeScore, awayScore: m.awayScore })
        }
      }

      for (const [matchIdStr, pick] of Object.entries(currentKoPicks)) {
        if (pick.winnerId && pick.homeScore !== null && pick.awayScore !== null) {
          predictions.push({
            matchId: Number(matchIdStr),
            homeScore: pick.homeScore,
            awayScore: pick.awayScore,
            winnerId: pick.winnerId,
          })
        }
      }

      if (predictions.length === 0 && !championPickRef.current) return true

      try {
        const body: Record<string, unknown> = {}
        if (predictions.length > 0) body.predictions = predictions
        if (championPickRef.current) body.championPick = championPickRef.current

        const res = await gameFetch(`/api/games/${code}/predictions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        return res.ok
      } catch {
        return false
      }
    },
  })

  // Determine which phase we're in
  const groupRound = rounds.find((r) => r.roundKey === 'group')
  const isGroupOpen = groupRound?.status === 'open'
  const isGroupLocked = groupRound?.status === 'locked' || groupRound?.status === 'scored'
  const koRounds: PredictionRoundKey[] = ['r32', 'r16', 'qf', 'sf', 'final']
  const openKoRound = koRounds.find(
    (rk) => rounds.find((r) => r.roundKey === rk)?.status === 'open',
  )
  const anyKoRound = koRounds.find(
    (rk) => {
      const st = rounds.find((r) => r.roundKey === rk)?.status
      return st === 'open' || st === 'locked' || st === 'scored'
    },
  )

  const isKnockoutPhase = !isGroupOpen && anyKoRound !== undefined
  const activeKoRound = openKoRound ?? anyKoRound ?? 'r32'

  // Fetch bracket for knockout phase
  useEffect(() => {
    if (!isKnockoutPhase) return

    async function fetchBracket() {
      const res = await gameFetch(`/api/games/${code}/bracket`)
      if (res.ok) {
        const data = await res.json()
        const fixtures: KnockoutFixture[] = (data.knockoutMatches ?? []).map(
          (m: KnockoutMatch) => ({
            matchId: m.id,
            homeTeamId: m.homeTeamId,
            awayTeamId: m.awayTeamId,
            homeSlot: m.homeSlot,
            awaySlot: m.awaySlot,
            round: m.round,
          }),
        )
        setKnockoutFixtures(fixtures)
      }
    }
    fetchBracket()
  }, [isKnockoutPhase, code])

  // Load existing knockout predictions (own only)
  useEffect(() => {
    if (!currentPlayerId) return
    async function loadExisting() {
      const res = await gameFetch(`/api/games/${code}/predictions`)
      if (!res.ok) return
      const data = await res.json()
      if (!data.predictions?.length) return

      const koPicks: Record<number, KnockoutPrediction> = {}
      for (const p of data.predictions) {
        if (p.match_id > GROUP_MATCH_MAX_ID && p.player_id === currentPlayerId) {
          koPicks[p.match_id] = {
            homeScore: p.home_score ?? null,
            awayScore: p.away_score ?? null,
            winnerId: p.winner_id ?? '',
          }
        }
      }
      setKnockoutPicks(koPicks)
    }
    loadExisting()
  }, [code, currentPlayerId])

  // Load scores for scored rounds
  useEffect(() => {
    const scoredRounds = rounds.filter((r) => r.status === 'scored')
    if (scoredRounds.length === 0) return

    async function loadScores() {
      const res = await gameFetch(`/api/games/${code}/scores`)
      if (!res.ok) return
      const data = await res.json()
      if (!data.scores?.length) return

      const pointsMap = new Map<number, number>()
      for (const s of data.scores) {
        pointsMap.set(s.match_id, s.points)
      }
      setScoredMatchPoints(pointsMap)
    }
    loadScores()
  }, [code, rounds])

  // Handlers
  const handleKnockoutScoreChange = useCallback(
    (matchId: number, side: 'home' | 'away', value: number | null) => {
      setKnockoutPicks((prev) => {
        const existing = prev[matchId] ?? { homeScore: null, awayScore: null, winnerId: '' }
        const updated = { ...existing }
        if (side === 'home') updated.homeScore = value
        else updated.awayScore = value

        // Auto-derive winner when scores differ
        if (updated.homeScore !== null && updated.awayScore !== null) {
          if (updated.homeScore !== updated.awayScore) {
            // Find fixture to get team IDs
            const fixture = knockoutFixtures.find((f) => f.matchId === matchId)
            if (fixture) {
              updated.winnerId = updated.homeScore > updated.awayScore
                ? fixture.homeTeamId ?? ''
                : fixture.awayTeamId ?? ''
            }
          } else {
            // Tied — clear auto-derived winner, need shootout pick
            updated.winnerId = ''
          }
        } else {
          updated.winnerId = ''
        }

        return { ...prev, [matchId]: updated }
      })
      markDirty()
    },
    [markDirty, knockoutFixtures],
  )

  const handleShootoutPick = useCallback(
    (matchId: number, winnerId: string) => {
      setKnockoutPicks((prev) => {
        const existing = prev[matchId] ?? { homeScore: null, awayScore: null, winnerId: '' }
        return { ...prev, [matchId]: { ...existing, winnerId } }
      })
      markDirty()
    },
    [markDirty],
  )

  const handleChampionPick = useCallback(
    (teamId: string) => {
      setChampionPick(teamId)
      markDirty()
    },
    [markDirty],
  )

  // Mark dirty on group score changes
  const prevGroupRef = useRef(JSON.stringify(state.groupMatches))
  useEffect(() => {
    const curr = JSON.stringify(state.groupMatches)
    if (curr !== prevGroupRef.current) {
      prevGroupRef.current = curr
      markDirty()
    }
  }, [state.groupMatches, markDirty])

  const groupReadOnly = !isGroupOpen
  const koReadOnly = !openKoRound

  const handleQuickFillGroups = useCallback(() => {
    const { filled, filledIds } = quickFillGroupMatches(state.groupMatches)
    for (const m of filled) {
      if (filledIds.has(m.id) && m.homeScore !== null && m.awayScore !== null) {
        dispatch({ type: 'SET_MATCH_SCORE', matchId: m.id, homeScore: m.homeScore, awayScore: m.awayScore })
      }
    }
    setShowQuickFillBanner(true)
    setTimeout(() => setShowQuickFillBanner(false), 3000)
    markDirty()
  }, [state.groupMatches, dispatch, markDirty])

  const handleQuickFillKnockout = useCallback(() => {
    const newPicks = quickFillKnockoutPicks(knockoutFixtures, knockoutPicks)
    setKnockoutPicks((prev) => ({ ...prev, ...newPicks }))
    setShowQuickFillBanner(true)
    setTimeout(() => setShowQuickFillBanner(false), 3000)
    markDirty()
  }, [knockoutFixtures, knockoutPicks, markDirty])

  return (
    <>
      {/* Quick-fill banner */}
      {showQuickFillBanner && (
        <div className="mb-4 rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 animate-fadeIn">
          Quick-filled with ranking-based predictions. Review and adjust as needed.
        </div>
      )}

      {isGroupOpen || (isGroupLocked && !isKnockoutPhase) ? (
        <GroupPhaseInner
          championPick={championPick}
          onChampionPick={handleChampionPick}
          readOnly={groupReadOnly}
          onQuickFill={isGroupOpen ? handleQuickFillGroups : undefined}
        />
      ) : isKnockoutPhase ? (
        <KnockoutPhaseInner
          rounds={rounds}
          activeRound={activeKoRound}
          fixtures={knockoutFixtures}
          picks={knockoutPicks}
          onScoreChange={handleKnockoutScoreChange}
          onShootoutPick={handleShootoutPick}
          readOnly={koReadOnly}
          scoredMatchPoints={scoredMatchPoints.size > 0 ? scoredMatchPoints : undefined}
          onQuickFill={!koReadOnly ? handleQuickFillKnockout : undefined}
        />
      ) : (
        <div className="rounded-[var(--radius-card)] border border-line bg-card p-6 text-center">
          <p className="text-[13.5px] text-muted">
            No prediction rounds are currently open.
          </p>
        </div>
      )}

      <SavePill status={saveStatus} onRetry={retry} />
    </>
  )
}

// ─── Page Wrapper ───────────────────────────────────────────────────────────

export default function PredictPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const { game, currentPlayer, rounds, loading } = useGame(code)
  const [initialState, setInitialState] = useState<TournamentState | null>(null)
  const [loadingPredictions, setLoadingPredictions] = useState(true)
  const [championPick, setChampionPick] = useState<string | null>(null)

  useEffect(() => {
    if (!game) return

    async function loadExisting() {
      const res = await gameFetch(`/api/games/${code}/predictions`)
      if (res.ok) {
        const data = await res.json()
        if (data.predictions?.length > 0) {
          // Filter to own predictions only (API returns all visible predictions)
          const own = data.predictions.filter(
            (p: { player_id: string }) => p.player_id === currentPlayer!.id,
          )
          if (own.length > 0) {
            setInitialState(hydratePredictions(own))
          }
        }
      }

      // Load champion pick from current player
      if (currentPlayer?.championPick) {
        setChampionPick(currentPlayer.championPick)
      }

      setLoadingPredictions(false)
    }
    loadExisting()
  }, [game, code, currentPlayer?.championPick])

  if (loading || loadingPredictions) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Skeleton variant="card" className="mb-4" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      </div>
    )
  }

  if (!game || !currentPlayer) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm font-medium text-red">Session expired</p>
        <p className="max-w-sm text-center text-[13.5px] text-muted">
          Your browser session has expired. Use your recovery link to restore access, or rejoin the game.
        </p>
        <div className="flex gap-3">
          <Link href={`/play/${code}`} className="text-[11px] text-navy hover:underline">Back to game</Link>
          <Link href={`/play/join?code=${code}`} className="text-[11px] text-muted hover:text-ink hover:underline">Rejoin</Link>
        </div>
      </div>
    )
  }

  // Check if there's any round the player can interact with
  const hasAnyActiveRound = rounds.some(
    (r) => r.status === 'open' || r.status === 'locked' || r.status === 'scored',
  )
  if (!hasAnyActiveRound) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-[13.5px] text-muted">No prediction rounds are currently available.</p>
        <Link href={`/play/${code}`} className="text-[11px] text-navy hover:underline">Back to dashboard</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24">
      <Link href={`/play/${code}`} className="mb-4 inline-block text-[11px] text-muted hover:text-ink">
        &larr; Dashboard
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-[24px] font-bold text-ink">
          Predictions
        </h1>
        {DEADLINE_ENFORCEMENT_ENABLED && (() => {
          const openRound = rounds.find((r) => r.status === 'open')
          if (!openRound) return null
          const dl = getPredictionRoundDeadline(openRound.roundKey).toISOString()
          return <CountdownBadgeInline deadline={dl} />
        })()}
      </div>

      <PredictionProvider initialState={initialState ?? undefined}>
        <PredictInner
          code={code}
          rounds={rounds}
          currentChampionPick={championPick}
          currentPlayerId={currentPlayer.id}
        />
      </PredictionProvider>
    </div>
  )
}
