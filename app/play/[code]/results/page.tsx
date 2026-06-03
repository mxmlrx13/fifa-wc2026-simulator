'use client'

import { use, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useGame } from '@/lib/supabase/use-game'
import { getMatchIdsForRound, getRoundLabel, getAllRounds, type RoundKey } from '@/lib/engine/rounds'
import { groupFixtures } from '@/lib/data/fixtures'
import { bracketTemplate } from '@/lib/data/bracket-template'
import { teamsMap } from '@/lib/data/teams'
import ScoreInput from '@/components/shared/ScoreInput'
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

function slotLabel(slot: string): string {
  if (slot.startsWith('W')) return `Winner M${slot.slice(1)}`
  if (slot.startsWith('L')) return `Loser M${slot.slice(1)}`
  return slot
}

export default function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const { game, currentPlayer, loading } = useGame(code)
  const [selectedBatch, setSelectedBatch] = useState<RoundKey>('group_md1')
  const [results, setResults] = useState<Map<number, MatchResult>>(new Map())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const matchIds = getMatchIdsForRound(selectedBatch)
  const isKnockoutBatch = !selectedBatch.startsWith('group_md')

  // Reset results when batch changes
  useEffect(() => {
    setResults(new Map())
    setSaved(false)
  }, [selectedBatch])

  const updateResult = useCallback(
    (matchId: number, side: 'home' | 'away', value: number | null) => {
      setResults((prev) => {
        const next = new Map(prev)
        const existing = next.get(matchId) ?? { matchId, homeScore: null, awayScore: null }
        if (side === 'home') existing.homeScore = value
        else existing.awayScore = value
        next.set(matchId, { ...existing })
        return next
      })
      setSaved(false)
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
      setSaved(false)
    },
    [],
  )

  async function handleSubmit() {
    setSaving(true)

    const payload = Array.from(results.values())
      .filter((r) => r.homeScore !== null && r.awayScore !== null)
      .map((r) => ({
        matchId: r.matchId,
        homeScore: r.homeScore!,
        awayScore: r.awayScore!,
        winnerId: r.winnerId ?? undefined,
      }))

    const res = await fetch(`/api/games/${code}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results: payload, batch: selectedBatch }),
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-500">Loading...</div>
  }

  if (!game || !currentPlayer?.isHost) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-neon-red">Only the host can enter results</p>
        <Link href={`/play/${code}`} className="text-xs text-accent hover:underline">Back</Link>
      </div>
    )
  }

  const completeResults = Array.from(results.values()).filter(
    (r) => r.homeScore !== null && r.awayScore !== null,
  ).length

  const allRounds = getAllRounds()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/play/${code}`} className="mb-4 inline-block text-xs text-gray-500 hover:text-accent">
        &larr; Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-neon-green">Enter Real Results</h1>
        <p className="text-xs text-gray-500">
          Select a batch and enter scores for those matches.
        </p>
      </div>

      {/* Batch selector */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {allRounds.map((round) => (
          <button
            key={round}
            onClick={() => setSelectedBatch(round)}
            className={cn(
              'rounded-md px-2.5 py-1.5 text-xs font-bold transition-all',
              selectedBatch === round
                ? 'bg-accent text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
            )}
          >
            {getRoundLabel(round).replace('Group Stage — ', '')}
          </button>
        ))}
      </div>

      <p className="mb-4 text-xs text-gray-500">
        {getRoundLabel(selectedBatch)} &mdash; {completeResults}/{matchIds.length} entered
      </p>

      <div className="space-y-2">
        {matchIds.map((matchId) => {
          const info = getMatchInfo(matchId)
          if (!info) return null

          const result = results.get(matchId)
          const homeTeam = info.homeTeamId ? teamsMap[info.homeTeamId] : null
          const awayTeam = info.awayTeamId ? teamsMap[info.awayTeamId] : null
          const isTied = result?.homeScore !== null && result?.awayScore !== null &&
                         result?.homeScore === result?.awayScore && isKnockoutBatch

          return (
            <div key={matchId}>
              <div className="glass-card flex items-center gap-2 px-4 py-3">
                <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  M{matchId}
                </span>

                <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-right">
                  {homeTeam ? (
                    <>
                      <span className="truncate text-xs font-semibold">{homeTeam.id}</span>
                      <span className="text-base leading-none">{flagEmoji(homeTeam.flagCode)}</span>
                    </>
                  ) : (
                    <span className="text-[10px] italic text-gray-400">
                      {slotLabel((info as { homeSlot?: string }).homeSlot ?? '?')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <ScoreInput
                    value={result?.homeScore ?? null}
                    onChange={(v) => updateResult(matchId, 'home', v)}
                  />
                  <span className="text-xs font-bold text-gray-400">-</span>
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
                    <span className="text-[10px] italic text-gray-400">
                      {slotLabel((info as { awaySlot?: string }).awaySlot ?? '?')}
                    </span>
                  )}
                </div>
              </div>

              {/* Winner picker for tied knockout matches */}
              {isTied && homeTeam && awayTeam && (
                <div className="ml-16 mt-1 flex items-center gap-2 text-xs text-amber-700">
                  <span>Winner (penalties):</span>
                  <button
                    onClick={() => setWinner(matchId, homeTeam.id)}
                    className={cn(
                      'rounded px-2 py-0.5 font-bold transition-all',
                      result?.winnerId === homeTeam.id ? 'bg-accent text-white' : 'bg-gray-100 hover:bg-gray-200',
                    )}
                  >
                    {homeTeam.id}
                  </button>
                  <button
                    onClick={() => setWinner(matchId, awayTeam.id)}
                    className={cn(
                      'rounded px-2 py-0.5 font-bold transition-all',
                      result?.winnerId === awayTeam.id ? 'bg-accent text-white' : 'bg-gray-100 hover:bg-gray-200',
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

      <div className="sticky bottom-4 mt-6">
        <button
          onClick={handleSubmit}
          disabled={saving || completeResults === 0}
          className={cn(
            'w-full rounded-lg px-5 py-3 text-sm font-bold shadow-lg transition-all disabled:opacity-50',
            saved
              ? 'bg-neon-green/20 text-neon-green glow-green'
              : 'bg-neon-green/20 text-neon-green hover:bg-neon-green/30',
          )}
        >
          {saving
            ? 'Saving & Computing Scores...'
            : saved
              ? 'Results Saved & Scores Computed!'
              : `Submit ${completeResults} Result${completeResults === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}
