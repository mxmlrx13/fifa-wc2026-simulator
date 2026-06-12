'use client'

import { use, useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useGame } from '@/lib/supabase/use-game'
import { getMatchIdsForRound, getRoundLabel, getAllRounds, type RoundKey } from '@/lib/engine/rounds'
import { groupFixtures } from '@/lib/data/fixtures'
import { bracketTemplate } from '@/lib/data/bracket-template'
import { teamsMap } from '@/lib/data/teams'
import { THIRD_PLACE_MATCH_ID, FINAL_MATCH_ID } from '@/lib/constants'
import ScoreInput from '@/components/shared/ScoreInput'
import SuggestionReview from '@/components/multiplayer/SuggestionReview'
import Skeleton from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

function flagEmoji(flagCode: string): string {
  if (flagCode === 'gb-eng') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'
  if (flagCode === 'gb-sct') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'
  if (flagCode === 'gb-wls') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}'
  const code = flagCode.toUpperCase()
  return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + 0x1F1A5))
}

interface MatchResult {
  matchId: number
  homeScore: number | null
  awayScore: number | null
  winnerId?: string | null
}

function getMatchInfo(matchId: number) {
  const groupMatch = groupFixtures.find((m) => m.id === matchId)
  if (groupMatch) {
    return {
      homeTeamId: groupMatch.homeTeamId,
      awayTeamId: groupMatch.awayTeamId,
      label: `Group ${groupMatch.groupId}`,
      isKnockout: false,
    }
  }
  const koMatch = bracketTemplate.find((m) => m.id === matchId)
  if (koMatch) {
    return {
      homeTeamId: koMatch.homeTeamId ?? null,
      awayTeamId: koMatch.awayTeamId ?? null,
      homeSlot: koMatch.homeSlot,
      awaySlot: koMatch.awaySlot,
      label: koMatch.round,
      isKnockout: true,
    }
  }
  return null
}

function getMatchDisplayLabel(matchId: number): string | null {
  if (matchId === THIRD_PLACE_MATCH_ID) return 'Third-place match'
  if (matchId === FINAL_MATCH_ID) return 'Final'
  return null
}

function slotLabel(slot: string): string {
  if (slot.startsWith('W')) return `Winner M${slot.slice(1)}`
  if (slot.startsWith('L')) return `Loser M${slot.slice(1)}`
  return slot
}

// Track per-batch completion from existing official_results
interface BatchState {
  total: number
  entered: number
}

export default function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const { game, currentPlayer, loading } = useGame(code)
  const [selectedBatch, setSelectedBatch] = useState<RoundKey>('group_md1')
  const [results, setResults] = useState<Map<number, MatchResult>>(new Map())
  const [dbMatchIds, setDbMatchIds] = useState<Set<number>>(new Set())
  const [dirtyMatchIds, setDirtyMatchIds] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [batchStates, setBatchStates] = useState<Record<string, BatchState>>({})
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const matchIds = getMatchIdsForRound(selectedBatch)
  const isKnockoutBatch = !selectedBatch.startsWith('group_md')
  const allRounds = getAllRounds()

  // Fetch batch states (how many results exist per batch)
  useEffect(() => {
    if (!game) return
    async function fetchBatchStates() {
      const res = await fetch(`/api/games/${code}/results/status`)
      if (res.ok) {
        const data = await res.json()
        setBatchStates(data.batches ?? {})
      }
    }
    fetchBatchStates()
  }, [game, code, saved, refreshKey])

  // Load existing results when batch changes or after suggestion approval
  useEffect(() => {
    setResults(new Map())
    setDbMatchIds(new Set())
    setDirtyMatchIds(new Set())
    setSaved(false)
    setSubmitError(null)

    if (!game) return
    let cancelled = false
    setLoadingExisting(true)

    fetch(`/api/games/${code}/results?batch=${selectedBatch}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data) {
          const existing = new Map<number, MatchResult>()
          const fromDb = new Set<number>()
          for (const r of data.results ?? []) {
            existing.set(r.match_id, {
              matchId: r.match_id,
              homeScore: r.home_score,
              awayScore: r.away_score,
              winnerId: r.winner_id,
            })
            fromDb.add(r.match_id)
          }
          setResults(existing)
          setDbMatchIds(fromDb)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false)
      })

    return () => { cancelled = true }
  }, [selectedBatch, game, code, refreshKey])

  const tiedWithoutWinner = useMemo(() => {
    if (!isKnockoutBatch) return []
    return Array.from(results.values()).filter(
      (r) =>
        r.homeScore !== null &&
        r.awayScore !== null &&
        r.homeScore === r.awayScore &&
        !r.winnerId,
    )
  }, [results, isKnockoutBatch])

  const updateResult = useCallback(
    (matchId: number, side: 'home' | 'away', value: number | null) => {
      setResults((prev) => {
        const next = new Map(prev)
        const existing = next.get(matchId) ?? { matchId, homeScore: null, awayScore: null }
        if (side === 'home') existing.homeScore = value
        else existing.awayScore = value
        if (existing.homeScore !== null && existing.awayScore !== null && existing.homeScore !== existing.awayScore) {
          existing.winnerId = undefined
        }
        next.set(matchId, { ...existing })
        return next
      })
      setDirtyMatchIds((prev) => new Set(prev).add(matchId))
      setSaved(false)
      setSubmitError(null)
    },
    [],
  )

  const setWinner = useCallback(
    (matchId: number, winnerId: string) => {
      setResults((prev) => {
        const next = new Map(prev)
        const existing = next.get(matchId) ?? { matchId, homeScore: null, awayScore: null }
        existing.winnerId = winnerId
        next.set(matchId, { ...existing })
        return next
      })
      setDirtyMatchIds((prev) => new Set(prev).add(matchId))
      setSaved(false)
      setSubmitError(null)
    },
    [],
  )

  async function handleSubmit() {
    setSaving(true)
    setSubmitError(null)

    // Only submit results that are new or modified by the user
    const payload = Array.from(results.values())
      .filter((r) => r.homeScore !== null && r.awayScore !== null)
      .filter((r) => !dbMatchIds.has(r.matchId) || dirtyMatchIds.has(r.matchId))
      .map((r) => ({
        matchId: r.matchId,
        homeScore: r.homeScore!,
        awayScore: r.awayScore!,
        winnerId: r.winnerId ?? undefined,
      }))

    if (payload.length === 0) {
      setSaving(false)
      setSaved(true)
      return
    }

    const res = await fetch(`/api/games/${code}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results: payload, batch: selectedBatch }),
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
      // Move submitted results into dbMatchIds
      setDbMatchIds((prev) => {
        const next = new Set(prev)
        for (const r of payload) next.add(r.matchId)
        return next
      })
      setDirtyMatchIds(new Set())
    } else {
      const data = await res.json().catch(() => ({ error: 'Unknown error' }))
      setSubmitError(data.error ?? 'Failed to save results')
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton variant="card" className="mb-4" />
        <Skeleton variant="card" />
      </div>
    )
  }

  if (!game || !currentPlayer?.isHost) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm font-medium text-red">Only the host can enter results</p>
        <Link href={`/play/${code}`} className="text-[11px] text-muted hover:text-ink hover:underline">Back</Link>
      </div>
    )
  }

  const allCompleteResults = Array.from(results.values()).filter(
    (r) => r.homeScore !== null && r.awayScore !== null,
  )
  const newOrModifiedResults = allCompleteResults.filter(
    (r) => !dbMatchIds.has(r.matchId) || dirtyMatchIds.has(r.matchId),
  )
  const completeResults = allCompleteResults.length
  const submittableCount = newOrModifiedResults.length

  const canSubmit = submittableCount > 0 && tiedWithoutWinner.length === 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 animate-fadeIn">
      <Link href={`/play/${code}`} className="mb-4 inline-block text-[11px] text-muted hover:text-ink">
        &larr; Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-[24px] font-bold text-ink">Enter Real Results</h1>
        <p className="text-[13.5px] text-muted">
          Select a batch and enter scores for those matches.
        </p>
      </div>

      {/* Suggestions from auto-results */}
      <div className="mb-6">
        <SuggestionReview code={code} onResultsChanged={() => setRefreshKey((k) => k + 1)} />
      </div>

      {/* Batch pills with per-batch state */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {allRounds.map((round) => {
          const bs = batchStates[round]
          const total = bs?.total ?? 0
          const entered = bs?.entered ?? 0
          const isDone = total > 0 && entered === total

          return (
            <button
              key={round}
              onClick={() => setSelectedBatch(round)}
              className={cn(
                'rounded-[var(--radius-pill)] px-2.5 py-1 text-[10px] font-bold transition-all',
                selectedBatch === round
                  ? 'bg-navy text-paper'
                  : isDone
                    ? 'bg-win-soft text-win-ink'
                    : 'border border-line bg-transparent text-muted hover:bg-paper hover:text-ink',
              )}
            >
              {getRoundLabel(round).replace('Group Stage — ', '')}
              {isDone && ' \u2713'}
              {total > 0 && !isDone && entered > 0 && (
                <span className="ml-1 tabular-nums">{entered}/{total}</span>
              )}
            </button>
          )
        })}
      </div>

      <p className="mb-4 text-[11px] text-muted tabular-nums">
        {getRoundLabel(selectedBatch)} &mdash; {completeResults}/{matchIds.length} entered
      </p>

      {loadingExisting ? (
        <div className="space-y-2">
          <Skeleton variant="row" />
          <Skeleton variant="row" />
          <Skeleton variant="row" />
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {matchIds.map((matchId) => {
            const info = getMatchInfo(matchId)
            if (!info) return null

            const result = results.get(matchId)
            const homeTeam = info.homeTeamId ? teamsMap[info.homeTeamId] : null
            const awayTeam = info.awayTeamId ? teamsMap[info.awayTeamId] : null
            const isTied = result?.homeScore !== null && result?.awayScore !== null &&
                           result?.homeScore === result?.awayScore && isKnockoutBatch
            const isMissingWinner = isTied && !result?.winnerId
            const distinctLabel = getMatchDisplayLabel(matchId)

            return (
              <div key={matchId}>
                {distinctLabel && (
                  <p className="mt-4 mb-1 text-[10px] font-bold uppercase tracking-[0.09em] text-navy md:col-span-2">
                    {distinctLabel}
                  </p>
                )}
                <div className={cn(
                  'flex items-center gap-2 rounded-[var(--radius-card)] border border-line bg-card px-4 py-3',
                  isMissingWinner && 'ring-2 ring-red/50',
                )}>
                  <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-[0.09em] text-muted tabular-nums">
                    M{matchId}
                  </span>

                  <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-right">
                    {homeTeam ? (
                      <>
                        <span className="truncate text-xs font-semibold">{homeTeam.id}</span>
                        <span className="text-base leading-none">{flagEmoji(homeTeam.flagCode)}</span>
                      </>
                    ) : (
                      <span className="text-[10px] italic text-muted">
                        {slotLabel((info as { homeSlot?: string }).homeSlot ?? '?')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <ScoreInput
                      value={result?.homeScore ?? null}
                      onChange={(v) => updateResult(matchId, 'home', v)}
                    />
                    <span className="text-xs font-bold text-muted">-</span>
                    <ScoreInput
                      value={result?.awayScore ?? null}
                      onChange={(v) => updateResult(matchId, 'away', v)}
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    {awayTeam ? (
                      <>
                        <span className="text-base leading-none">{flagEmoji(awayTeam.flagCode)}</span>
                        <span className="truncate text-xs font-semibold">{awayTeam.id}</span>
                      </>
                    ) : (
                      <span className="text-[10px] italic text-muted">
                        {slotLabel((info as { awaySlot?: string }).awaySlot ?? '?')}
                      </span>
                    )}
                  </div>
                </div>

                {isTied && homeTeam && awayTeam && (
                  <div className={cn(
                    'ml-12 mt-1 flex items-center gap-2 text-xs',
                    isMissingWinner ? 'text-red font-semibold' : 'text-third-ink',
                  )}>
                    <span>{isMissingWinner ? 'Select winner:' : 'Winner:'}</span>
                    <button
                      onClick={() => setWinner(matchId, homeTeam.id)}
                      className={cn(
                        'rounded px-2 py-0.5 font-bold transition-all',
                        result?.winnerId === homeTeam.id ? 'bg-navy text-paper' : 'bg-out-soft hover:bg-line',
                      )}
                    >
                      {homeTeam.id}
                    </button>
                    <button
                      onClick={() => setWinner(matchId, awayTeam.id)}
                      className={cn(
                        'rounded px-2 py-0.5 font-bold transition-all',
                        result?.winnerId === awayTeam.id ? 'bg-navy text-paper' : 'bg-out-soft hover:bg-line',
                      )}
                    >
                      {awayTeam.id}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {submitError && (
        <p className="mt-4 text-xs font-semibold text-red">{submitError}</p>
      )}

      {/* Sticky bottom bar */}
      <div className="sticky bottom-4 mt-6">
        <button
          onClick={handleSubmit}
          disabled={saving || !canSubmit || (completeResults > 0 && submittableCount === 0)}
          className={cn(
            'w-full rounded-[var(--radius-button)] px-5 py-3 text-sm font-bold shadow-float transition-all disabled:opacity-50',
            saved || (completeResults > 0 && submittableCount === 0)
              ? 'bg-win-soft text-win-ink'
              : 'bg-navy text-paper hover:brightness-94',
          )}
        >
          {saving
            ? 'Saving & Computing Scores...'
            : saved || (completeResults > 0 && submittableCount === 0)
              ? `${completeResults} Result${completeResults === 1 ? '' : 's'} Saved`
              : tiedWithoutWinner.length > 0
                ? `Select winner for ${tiedWithoutWinner.length} tied match${tiedWithoutWinner.length === 1 ? '' : 'es'}`
                : `Submit ${submittableCount} New Result${submittableCount === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}
