'use client'

import { use, useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useGame } from '@/lib/supabase/use-game'
import type { GroupId, TournamentState } from '@/lib/types'
import { useTournament } from '@/lib/store'
import { hydratePredictions } from '@/lib/supabase/hydrate-predictions'
import PredictionProvider from '@/components/multiplayer/PredictionProvider'
import GroupCard from '@/components/groups/GroupCard'
import GroupStandingsTable from '@/components/groups/GroupStandingsTable'
import ThirdPlaceTable from '@/components/standings/ThirdPlaceTable'
import QualifiedTeamsGrid from '@/components/standings/QualifiedTeamsGrid'
import BracketView from '@/components/knockout/BracketView'
import { cn } from '@/lib/utils'

const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

type Tab = 'groups' | 'standings' | 'knockout'

function PredictInner({ code }: { code: string }) {
  const { state, allGroupsComplete, knockoutMatches, groupStandings, thirdPlaceResults } = useTournament()
  const [activeTab, setActiveTab] = useState<Tab>('groups')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const stateRef = useRef(state)
  stateRef.current = state

  const completedGroupMatches = state.groupMatches.filter(
    (m) => m.homeScore !== null && m.awayScore !== null,
  ).length
  const totalGroupMatches = state.groupMatches.length
  const knockoutPicks = Object.keys(state.knockoutPicks).length

  async function handleSave() {
    setSaving(true)
    const s = stateRef.current

    const predictions: Array<
      | { matchId: number; homeScore: number; awayScore: number }
      | { matchId: number; winnerId: string }
    > = []

    for (const m of s.groupMatches) {
      if (m.homeScore !== null && m.awayScore !== null) {
        predictions.push({ matchId: m.id, homeScore: m.homeScore, awayScore: m.awayScore })
      }
    }

    for (const [matchId, winnerId] of Object.entries(s.knockoutPicks)) {
      predictions.push({ matchId: Number(matchId), winnerId })
    }

    const res = await fetch(`/api/games/${code}/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictions }),
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
    }
  }

  const tabs: { key: Tab; label: string; badge?: string }[] = [
    { key: 'groups', label: 'Groups', badge: `${completedGroupMatches}/${totalGroupMatches}` },
    { key: 'standings', label: 'Standings' },
    { key: 'knockout', label: 'Knockout', badge: knockoutPicks > 0 ? `${knockoutPicks}` : undefined },
  ]

  return (
    <>
      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSaved(false) }}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-xs font-bold transition-all',
              activeTab === tab.key
                ? 'bg-white text-accent shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
            {tab.badge && (
              <span className="ml-1.5 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Groups tab */}
      {activeTab === 'groups' && (
        <div className="animate-fadeIn">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {groupIds.map((id) => (
              <GroupCard key={id} groupId={id} />
            ))}
          </div>
        </div>
      )}

      {/* Standings tab */}
      {activeTab === 'standings' && (
        <div className="animate-fadeIn">
          {!allGroupsComplete && (
            <div className="mb-6 glass-card rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
              Complete all group matches to see final standings and qualification results.
            </div>
          )}

          <section className="mb-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Group Tables
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groupIds.map((gid) => (
                <div key={gid} className="glass-card p-3">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">
                    Group {gid}
                  </h3>
                  <GroupStandingsTable standings={groupStandings[gid]} />
                </div>
              ))}
            </div>
          </section>

          {allGroupsComplete && thirdPlaceResults.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Third-Place Ranking
              </h2>
              <ThirdPlaceTable results={thirdPlaceResults} />
            </section>
          )}

          {allGroupsComplete && (
            <section className="mb-8">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Qualified Teams (32)
              </h2>
              <div className="glass-card p-4">
                <QualifiedTeamsGrid
                  groupStandings={groupStandings}
                  thirdPlaceResults={thirdPlaceResults}
                />
              </div>
            </section>
          )}
        </div>
      )}

      {/* Knockout tab */}
      {activeTab === 'knockout' && (
        <div className="animate-fadeIn">
          {!allGroupsComplete ? (
            <div className="glass-card rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
              Complete all group stage matches before filling in the knockout bracket.
            </div>
          ) : (
            <BracketView matches={knockoutMatches} />
          )}
        </div>
      )}

      {/* Sticky save bar */}
      <div className="sticky bottom-4 mt-6">
        <button
          onClick={handleSave}
          disabled={saving || (completedGroupMatches === 0 && knockoutPicks === 0)}
          className={cn(
            'w-full rounded-lg px-5 py-3 text-sm font-bold shadow-lg transition-all disabled:opacity-50',
            saved
              ? 'bg-neon-green/20 text-neon-green glow-green'
              : 'bg-accent/20 text-accent hover:bg-accent/30 glow-accent',
          )}
        >
          {saving
            ? 'Saving...'
            : saved
              ? 'All Predictions Saved!'
              : `Save All Predictions (${completedGroupMatches + knockoutPicks})`}
        </button>
      </div>
    </>
  )
}

export default function PredictPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const { game, currentPlayer, rounds, loading } = useGame(code)
  const [initialState, setInitialState] = useState<TournamentState | null>(null)
  const [loadingPredictions, setLoadingPredictions] = useState(true)

  useEffect(() => {
    if (!game) return

    async function loadExisting() {
      const res = await fetch(`/api/games/${code}/predictions`)
      if (res.ok) {
        const data = await res.json()
        if (data.predictions && data.predictions.length > 0) {
          setInitialState(hydratePredictions(data.predictions))
        }
      }
      setLoadingPredictions(false)
    }
    loadExisting()
  }, [game, code])

  if (loading || loadingPredictions) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-500">Loading...</div>
  }

  if (!game || !currentPlayer) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-neon-red">Cannot access this game</p>
        <Link href="/play" className="text-xs text-accent hover:underline">Back</Link>
      </div>
    )
  }

  const hasOpenRound = rounds.some((r) => r.status === 'open')
  if (!hasOpenRound) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-500">No prediction rounds are currently open.</p>
        <Link href={`/play/${code}`} className="text-xs text-accent hover:underline">Back to dashboard</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link href={`/play/${code}`} className="mb-4 inline-block text-xs text-gray-500 hover:text-accent">
        &larr; Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-accent">Enter Your Predictions</h1>
        <p className="text-xs text-gray-500">
          Fill in all group matches, check standings, then pick knockout winners.
        </p>
      </div>

      <PredictionProvider initialState={initialState ?? undefined}>
        <PredictInner code={code} />
      </PredictionProvider>
    </div>
  )
}
