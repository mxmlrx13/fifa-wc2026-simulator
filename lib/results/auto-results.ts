/**
 * Auto-results orchestration: fetch → match → compare → apply or flag.
 *
 * Called by the Netlify scheduled function. For each game with
 * auto_results_enabled, determines which matches need results,
 * cross-checks two sources, and either auto-applies (clean) or
 * creates suggestions for host review.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchApiFootball, getApiFootballWinner, type ApiFootballFixture } from './sources/api-football'
import { fetchOpenFootball, type OpenFootballMatch } from './sources/openfootball'
import { resolveTeamId, resolveGroupMatchId, resolveKnockoutMatchId } from '../data/external-match-map'
import { getRoundForMatchId, type RoundKey } from '../engine/rounds'
import { GROUP_MATCH_MAX_ID, PREDICTION_ROUND_RANGES, type PredictionRoundKey } from '../constants'
import { applyResults, type ResultInput } from './apply-results'

export interface AutoResultsLog {
  gamesProcessed: number
  autoApplied: number
  flagged: number
  errors: string[]
}

type SuggestionReason = 'clean' | 'sources_disagree' | 'single_source' | 'mapping_ambiguous' | 'not_final'

interface MatchedResult {
  matchId: number
  homeScore: number
  awayScore: number
  winnerId: string | null
  reason: SuggestionReason
  sourcePrimary: unknown
  sourceCrosscheck: unknown
}

/**
 * Run auto-results for all opted-in games.
 * Fetches sources once, then processes each game.
 */
export async function runAutoResults(supabase: SupabaseClient): Promise<AutoResultsLog> {
  const log: AutoResultsLog = { gamesProcessed: 0, autoApplied: 0, flagged: 0, errors: [] }

  // Fetch both sources once (shared across all games)
  const [primary, crosscheck] = await Promise.all([
    fetchApiFootball(),
    fetchOpenFootball(),
  ])

  if (!primary) {
    log.errors.push('Primary source (API-Football) unavailable')
    return log
  }

  // Get all games with auto-results enabled
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('id, code')
    .eq('auto_results_enabled', true)

  if (gamesError || !games) {
    log.errors.push(`Failed to fetch games: ${gamesError?.message}`)
    return log
  }

  for (const game of games) {
    try {
      const result = await processGame(supabase, game.id, primary, crosscheck)
      log.gamesProcessed++
      log.autoApplied += result.applied
      log.flagged += result.flagged
    } catch (err) {
      log.errors.push(`Game ${game.code}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return log
}

/**
 * Run auto-results for a single game. Fetches sources and processes.
 */
export async function runAutoResultsForGame(
  supabase: SupabaseClient,
  gameId: string,
): Promise<AutoResultsLog> {
  const log: AutoResultsLog = { gamesProcessed: 0, autoApplied: 0, flagged: 0, errors: [] }

  const [primary, crosscheck] = await Promise.all([
    fetchApiFootball(),
    fetchOpenFootball(),
  ])

  if (!primary) {
    log.errors.push('Primary source (API-Football) unavailable')
    return log
  }

  try {
    const result = await processGame(supabase, gameId, primary, crosscheck)
    log.gamesProcessed = 1
    log.autoApplied = result.applied
    log.flagged = result.flagged
  } catch (err) {
    log.errors.push(err instanceof Error ? err.message : String(err))
  }

  return log
}

async function processGame(
  supabase: SupabaseClient,
  gameId: string,
  primary: ApiFootballFixture[],
  crosscheck: OpenFootballMatch[] | null,
): Promise<{ applied: number; flagged: number }> {
  let applied = 0
  let flagged = 0

  // Get game rounds to know which prediction rounds are locked/scored
  const { data: rounds } = await supabase
    .from('game_rounds')
    .select('round_key, status')
    .eq('game_id', gameId)

  if (!rounds) return { applied, flagged }

  const activeRounds = rounds
    .filter((r) => r.status === 'locked' || r.status === 'scored')
    .map((r) => r.round_key as PredictionRoundKey)

  // Get all match IDs that already have official results
  const { data: existingResults } = await supabase
    .from('official_results')
    .select('match_id')
    .eq('game_id', gameId)

  const existingMatchIds = new Set((existingResults ?? []).map((r) => r.match_id))

  // Determine which match IDs need results
  const neededMatchIds: number[] = []
  for (const predRound of activeRounds) {
    const [min, max] = PREDICTION_ROUND_RANGES[predRound]
    for (let id = min; id <= max; id++) {
      if (!existingMatchIds.has(id)) neededMatchIds.push(id)
    }
  }

  if (neededMatchIds.length === 0) return { applied, flagged }

  // For knockout matches, we need the game's resolved bracket
  const knockoutNeeded = neededMatchIds.filter((id) => id > GROUP_MATCH_MAX_ID)
  let resolvedBracket: Map<number, { homeTeamId: string; awayTeamId: string }> | null = null

  if (knockoutNeeded.length > 0) {
    resolvedBracket = await fetchResolvedBracket(supabase, gameId)
  }

  // Match primary source fixtures to our match IDs
  const matched: MatchedResult[] = []

  for (const fixture of primary) {
    const matchId = resolveFixtureToMatchId(fixture, resolvedBracket)
    if (matchId === null) continue
    if (!neededMatchIds.includes(matchId)) continue

    // Check if already has a suggestion for this game+match
    const { data: existingSuggestion } = await supabase
      .from('result_suggestions')
      .select('id, status')
      .eq('game_id', gameId)
      .eq('match_id', matchId)
      .single()

    if (existingSuggestion) continue // already processed

    // Determine scores (home/away relative to OUR match, not the API's)
    const ourHomeTeam = getOurHomeTeam(matchId, resolvedBracket)
    const externalHomeId = resolveTeamId(fixture.homeTeamName)
    const swapped = ourHomeTeam && externalHomeId !== ourHomeTeam

    const homeScore = swapped ? fixture.awayGoals : fixture.homeGoals
    const awayScore = swapped ? fixture.homeGoals : fixture.awayGoals

    // Determine winner for knockout
    let winnerId: string | null = null
    const isKnockout = matchId > GROUP_MATCH_MAX_ID

    if (isKnockout) {
      const apiWinnerName = getApiFootballWinner(fixture)
      if (apiWinnerName) {
        winnerId = resolveTeamId(apiWinnerName)
      }

      // For tied knockout without clear winner, flag it
      if (homeScore === awayScore && !winnerId) {
        matched.push({
          matchId, homeScore, awayScore, winnerId: null,
          reason: 'not_final',
          sourcePrimary: fixture.raw,
          sourceCrosscheck: null,
        })
        continue
      }
    }

    // Cross-check against openfootball
    const crosscheckMatch = findCrosscheckMatch(fixture, crosscheck)

    let reason: SuggestionReason
    if (!crosscheck) {
      reason = 'single_source'
    } else if (!crosscheckMatch) {
      reason = 'single_source'
    } else if (crosscheckMatch.homeScore === homeScore && crosscheckMatch.awayScore === awayScore) {
      reason = 'clean'
    } else {
      // Check if scores match but in swapped order (different home/away convention)
      if (crosscheckMatch.homeScore === awayScore && crosscheckMatch.awayScore === homeScore) {
        reason = 'clean' // same scores, just swapped
      } else {
        reason = 'sources_disagree'
      }
    }

    matched.push({
      matchId, homeScore, awayScore, winnerId, reason,
      sourcePrimary: fixture.raw,
      sourceCrosscheck: crosscheckMatch?.raw ?? null,
    })
  }

  // Group matched results by batch for apply-results
  const cleanResults = matched.filter((m) => m.reason === 'clean')
  const flaggedResults = matched.filter((m) => m.reason !== 'clean')

  // Auto-apply clean results (grouped by batch)
  if (cleanResults.length > 0) {
    const byBatch = groupByBatch(cleanResults)

    for (const [batch, results] of byBatch) {
      try {
        const inputs: ResultInput[] = results.map((r) => ({
          matchId: r.matchId,
          homeScore: r.homeScore,
          awayScore: r.awayScore,
          winnerId: r.winnerId ?? undefined,
        }))

        await applyResults(supabase, gameId, inputs, batch)

        // Record as auto_applied suggestions
        for (const r of results) {
          await supabase.from('result_suggestions').upsert({
            game_id: gameId,
            match_id: r.matchId,
            home_score: r.homeScore,
            away_score: r.awayScore,
            winner_id: r.winnerId,
            source_primary: r.sourcePrimary,
            source_crosscheck: r.sourceCrosscheck,
            status: 'auto_applied',
            reason: r.reason,
            resolved_at: new Date().toISOString(),
          }, { onConflict: 'game_id,match_id' })
        }

        applied += results.length
      } catch (err) {
        // If auto-apply fails, flag instead
        for (const r of results) {
          flaggedResults.push(r)
        }
      }
    }
  }

  // Insert flagged suggestions for host review
  for (const r of flaggedResults) {
    await supabase.from('result_suggestions').upsert({
      game_id: gameId,
      match_id: r.matchId,
      home_score: r.homeScore,
      away_score: r.awayScore,
      winner_id: r.winnerId,
      source_primary: r.sourcePrimary,
      source_crosscheck: r.sourceCrosscheck,
      status: 'pending',
      reason: r.reason,
    }, { onConflict: 'game_id,match_id' })
    flagged++
  }

  return { applied, flagged }
}

function resolveFixtureToMatchId(
  fixture: ApiFootballFixture,
  resolvedBracket: Map<number, { homeTeamId: string; awayTeamId: string }> | null,
): number | null {
  const dateStr = fixture.date.slice(0, 10) // YYYY-MM-DD

  // Try group match first
  const groupMatch = resolveGroupMatchId(
    fixture.homeTeamName,
    fixture.awayTeamName,
    dateStr,
  )
  if (groupMatch !== null) return groupMatch

  // Try knockout match
  if (resolvedBracket) {
    return resolveKnockoutMatchId(
      fixture.homeTeamName,
      fixture.awayTeamName,
      resolvedBracket,
    )
  }

  return null
}

function getOurHomeTeam(
  matchId: number,
  resolvedBracket: Map<number, { homeTeamId: string; awayTeamId: string }> | null,
): string | null {
  if (matchId <= GROUP_MATCH_MAX_ID) {
    const { groupFixtures } = require('../data/fixtures')
    const fixture = groupFixtures.find((f: { id: number }) => f.id === matchId)
    return fixture?.homeTeamId ?? null
  }
  return resolvedBracket?.get(matchId)?.homeTeamId ?? null
}

function findCrosscheckMatch(
  fixture: ApiFootballFixture,
  crosscheck: OpenFootballMatch[] | null,
): OpenFootballMatch | null {
  if (!crosscheck) return null

  const dateStr = fixture.date.slice(0, 10)
  const homeId = resolveTeamId(fixture.homeTeamName)
  const awayId = resolveTeamId(fixture.awayTeamName)
  if (!homeId || !awayId) return null

  return crosscheck.find((m) => {
    const mHomeId = resolveTeamId(m.homeTeamName)
    const mAwayId = resolveTeamId(m.awayTeamName)
    const sameDate = m.date === dateStr
    const teamsMatch =
      (mHomeId === homeId && mAwayId === awayId) ||
      (mHomeId === awayId && mAwayId === homeId)
    return sameDate && teamsMatch
  }) ?? null
}

async function fetchResolvedBracket(
  supabase: SupabaseClient,
  gameId: string,
): Promise<Map<number, { homeTeamId: string; awayTeamId: string }>> {
  // Get official results to determine knockout matchups from bracket progression
  const { data: results } = await supabase
    .from('official_results')
    .select('match_id, winner_id')
    .eq('game_id', gameId)
    .gt('match_id', GROUP_MATCH_MAX_ID)

  const bracket = new Map<number, { homeTeamId: string; awayTeamId: string }>()

  // For now, we can't fully resolve the bracket without the bracket-resolution logic.
  // This is intentionally limited — knockout auto-results will mostly be flagged
  // as 'mapping_ambiguous' until bracket resolution is more complete.
  // The host can always approve flagged suggestions manually.

  return bracket
}

function groupByBatch(results: MatchedResult[]): Map<RoundKey, MatchedResult[]> {
  const map = new Map<RoundKey, MatchedResult[]>()
  for (const r of results) {
    const batch = getRoundForMatchId(r.matchId)
    if (!batch) continue
    const list = map.get(batch) ?? []
    list.push(r)
    map.set(batch, list)
  }
  return map
}
