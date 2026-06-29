'use client'

import { useState, useEffect } from 'react'
import { groupFixtures } from '@/lib/data/fixtures'
import { teamsMap } from '@/lib/data/teams'
import ScoreInput from '@/components/shared/ScoreInput'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface Suggestion {
  id: string
  match_id: number
  home_score: number | null
  away_score: number | null
  winner_id: string | null
  status: string
  reason: string
  source_primary: unknown
  source_crosscheck: unknown
  created_at: string
  resolved_at: string | null
}

interface KnockoutTeams {
  [matchId: number]: { homeTeamId: string; awayTeamId: string }
}

interface SuggestionReviewProps {
  code: string
  onResultsChanged?: () => void
}

const REASON_LABELS: Record<string, string> = {
  sources_disagree: 'Sources disagree',
  single_source: 'Single source only',
  mapping_ambiguous: 'Match mapping unclear',
  not_final: 'Match not yet final',
  clean: 'Sources agree',
}

function getMatchTeams(
  matchId: number,
  knockoutTeams?: KnockoutTeams,
): { homeId: string; awayId: string } | null {
  const gm = groupFixtures.find((f) => f.id === matchId)
  if (gm) return { homeId: gm.homeTeamId, awayId: gm.awayTeamId }
  const ko = knockoutTeams?.[matchId]
  if (ko) return { homeId: ko.homeTeamId, awayId: ko.awayTeamId }
  return null
}

export default function SuggestionReview({ code, onResultsChanged }: SuggestionReviewProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [knockoutTeams, setKnockoutTeams] = useState<KnockoutTeams>({})
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editScores, setEditScores] = useState<{ home: number | null; away: number | null }>({ home: null, away: null })
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/games/${code}/suggestions`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/games/${code}/bracket`).then((r) => r.ok ? r.json() : null),
    ]).then(([sugData, bracketData]) => {
      if (sugData?.suggestions) setSuggestions(sugData.suggestions)
      if (bracketData?.knockoutMatches) {
        const teams: KnockoutTeams = {}
        for (const m of bracketData.knockoutMatches) {
          if (m.homeTeamId && m.awayTeamId) {
            teams[m.id] = { homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId }
          }
        }
        setKnockoutTeams(teams)
      }
    }).finally(() => setLoading(false))
  }, [code])

  const pending = suggestions.filter((s) => s.status === 'pending')
  const autoApplied = suggestions.filter((s) => s.status === 'auto_applied')

  async function handleAction(suggestionId: string, action: 'approve' | 'dismiss', edited?: { homeScore: number; awayScore: number }) {
    setActionLoading(suggestionId)
    const body: Record<string, unknown> = { suggestionId, action }
    if (edited) {
      body.homeScore = edited.homeScore
      body.awayScore = edited.awayScore
    }

    const res = await fetch(`/api/games/${code}/suggestions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId ? { ...s, status: action === 'approve' ? 'host_applied' : 'dismissed' } : s,
        ),
      )
      if (action === 'approve') onResultsChanged?.()
    }
    setActionLoading(null)
    setEditingId(null)
  }

  if (loading) return null
  if (pending.length === 0 && autoApplied.length === 0) return null

  return (
    <div className="space-y-4">
      {/* Pending suggestions */}
      {pending.length > 0 && (
        <div>
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.09em] text-navy">
            Results to Review ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((s) => {
              const teams = getMatchTeams(s.match_id, knockoutTeams)
              const homeTeam = teams ? teamsMap[teams.homeId] : null
              const awayTeam = teams ? teamsMap[teams.awayId] : null
              const isEditing = editingId === s.id

              return (
                <div key={s.id} className="rounded-[var(--radius-card)] border border-line bg-card p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-muted tabular-nums">M{s.match_id}</span>
                      <span className="font-semibold">
                        {homeTeam?.id ?? '?'} {s.home_score ?? '?'} - {s.away_score ?? '?'} {awayTeam?.id ?? '?'}
                      </span>
                    </div>
                    <span className={cn(
                      'rounded-[var(--radius-pill)] px-2 py-0.5 text-[9px] font-bold',
                      s.reason === 'sources_disagree' ? 'bg-red-soft text-red' : 'bg-out-soft text-muted',
                    )}>
                      {REASON_LABELS[s.reason] ?? s.reason}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="mt-2 flex items-center gap-2">
                      <ScoreInput value={editScores.home} onChange={(v) => setEditScores((p) => ({ ...p, home: v }))} />
                      <span className="text-xs font-bold text-muted">-</span>
                      <ScoreInput value={editScores.away} onChange={(v) => setEditScores((p) => ({ ...p, away: v }))} />
                      <Button
                        variant="primary"
                        className="!px-3 !py-1.5 !text-[11px] !min-h-0"
                        loading={actionLoading === s.id}
                        onClick={() => {
                          if (editScores.home !== null && editScores.away !== null) {
                            handleAction(s.id, 'approve', {
                              homeScore: editScores.home,
                              awayScore: editScores.away,
                            })
                          }
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        className="!px-2 !py-1.5 !text-[11px] !min-h-0"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <Button
                        variant="primary"
                        className="!px-3 !py-1.5 !text-[11px] !min-h-0"
                        loading={actionLoading === s.id}
                        onClick={() => handleAction(s.id, 'approve')}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        className="!px-3 !py-1.5 !text-[11px] !min-h-0"
                        onClick={() => {
                          setEditingId(s.id)
                          setEditScores({ home: s.home_score, away: s.away_score })
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="!px-3 !py-1.5 !text-[11px] !min-h-0"
                        loading={actionLoading === s.id}
                        onClick={() => handleAction(s.id, 'dismiss')}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Auto-applied log */}
      {autoApplied.length > 0 && (
        <div>
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
            Auto-Entered Results ({autoApplied.length})
          </h3>
          <div className="space-y-1">
            {autoApplied.map((s) => {
              const teams = getMatchTeams(s.match_id, knockoutTeams)
              const homeTeam = teams ? teamsMap[teams.homeId] : null
              const awayTeam = teams ? teamsMap[teams.awayId] : null

              return (
                <div key={s.id} className="flex items-center gap-2 rounded-lg bg-out-soft px-3 py-1.5 text-[11px]">
                  <span className="font-mono text-muted tabular-nums">M{s.match_id}</span>
                  <span className="font-semibold text-ink">
                    {homeTeam?.id ?? '?'} {s.home_score} - {s.away_score} {awayTeam?.id ?? '?'}
                  </span>
                  <span className="rounded bg-win-soft px-1.5 py-0.5 text-[9px] font-bold text-win-ink">
                    auto
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
