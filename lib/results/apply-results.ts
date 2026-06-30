/**
 * Shared results pipeline — used by both the host route and the auto-results cron.
 * Extracted from POST /api/games/[code]/results to guarantee identical scoring
 * regardless of who triggers it.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { getMatchIdsForRound, type RoundKey } from '../engine/rounds'
import { computePoints } from '../engine/scoring'
import { computeLeaderboard } from '../engine/leaderboard'
import {
  getPredictionRoundForMatchId,
  PREDICTION_ROUNDS,
  PREDICTION_ROUND_RANGES,
  FINAL_MATCH_ID,
  CHAMPION_BONUS,
  CHAMPION_BONUS_MATCH_ID,
  type PredictionRoundKey,
} from '../constants'

export interface ResultInput {
  matchId: number
  homeScore: number
  awayScore: number
  winnerId?: string
}

export interface ApplyResultsOutput {
  resultsEntered: number
  scoresComputed: number
  championBonusAwarded: number
}

/**
 * Apply a batch of match results: write official_results, compute scores,
 * handle champion bonus, snapshot leaderboard, and transition rounds.
 *
 * Caller is responsible for auth and round-status validation.
 * This function is intentionally identical to the original inline logic
 * in the host results route.
 */
export async function applyResults(
  supabase: SupabaseClient,
  gameId: string,
  results: ResultInput[],
  batch: RoundKey,
): Promise<ApplyResultsOutput> {
  const batchMatchIds = getMatchIdsForRound(batch)
  const validMatchIdSet = new Set(batchMatchIds)
  const isKnockoutBatch = !batch.startsWith('group_md')

  // Build official result rows
  const resultRows = results
    .filter((r) => validMatchIdSet.has(r.matchId))
    .map((r) => ({
      game_id: gameId,
      match_id: r.matchId,
      home_score: r.homeScore,
      away_score: r.awayScore,
      winner_id: isKnockoutBatch
        ? (r.winnerId ?? (r.homeScore > r.awayScore ? 'home' : r.awayScore > r.homeScore ? 'away' : null))
        : null,
    }))

  const { error: resultError } = await supabase
    .from('official_results')
    .upsert(resultRows, { onConflict: 'game_id,match_id' })

  if (resultError) {
    throw new Error('Failed to save results')
  }

  // Compute scores for all players
  const submittedMatchIds = resultRows.map((r) => r.match_id)
  const { data: predictions } = await supabase
    .from('predictions')
    .select('player_id, match_id, home_score, away_score, winner_id')
    .eq('game_id', gameId)
    .in('match_id', submittedMatchIds)

  const resultMap = new Map(resultRows.map((r) => [r.match_id, r]))

  const scoreRows = (predictions ?? [])
    .filter((p) => resultMap.has(p.match_id))
    .map((p) => {
      const actual = resultMap.get(p.match_id)!

      if (isKnockoutBatch) {
        // Same tiered scoring as group stage + 1 bonus for correct penalty winner
        let points = 0
        if (p.home_score !== null && p.away_score !== null) {
          points = computePoints(p.home_score, p.away_score, actual.home_score, actual.away_score).points
          // +1 bonus for correct penalty winner (only on actual draws)
          if (actual.home_score === actual.away_score && p.winner_id && actual.winner_id && p.winner_id === actual.winner_id) {
            points += 1
          }
        }

        return {
          player_id: p.player_id,
          game_id: gameId,
          match_id: p.match_id,
          points,
          prediction_home: p.home_score,
          prediction_away: p.away_score,
          actual_home: actual.home_score,
          actual_away: actual.away_score,
          predicted_winner_id: p.winner_id,
          actual_winner_id: actual.winner_id,
        }
      }

      if (p.home_score === null || p.away_score === null) {
        return {
          player_id: p.player_id,
          game_id: gameId,
          match_id: p.match_id,
          points: 0,
          prediction_home: p.home_score,
          prediction_away: p.away_score,
          actual_home: actual.home_score,
          actual_away: actual.away_score,
          predicted_winner_id: null,
          actual_winner_id: null,
        }
      }

      const { points } = computePoints(
        p.home_score,
        p.away_score,
        actual.home_score,
        actual.away_score,
      )
      return {
        player_id: p.player_id,
        game_id: gameId,
        match_id: p.match_id,
        points,
        prediction_home: p.home_score,
        prediction_away: p.away_score,
        actual_home: actual.home_score,
        actual_away: actual.away_score,
        predicted_winner_id: null,
        actual_winner_id: null,
      }
    })

  if (scoreRows.length > 0) {
    const { error: scoreError } = await supabase
      .from('scores')
      .upsert(scoreRows, { onConflict: 'player_id,game_id,match_id' })

    if (scoreError) {
      throw new Error('Failed to compute scores')
    }
  }

  // Champion bonus
  let championBonusAwarded = 0
  if (submittedMatchIds.includes(FINAL_MATCH_ID)) {
    const finalResult = resultMap.get(FINAL_MATCH_ID)
    if (finalResult?.winner_id) {
      const actualChampion = finalResult.winner_id
      const { data: allPlayers } = await supabase
        .from('players')
        .select('id, champion_pick')
        .eq('game_id', gameId)

      const bonusRows = (allPlayers ?? [])
        .filter((pl) => pl.champion_pick != null)
        .map((pl) => ({
          player_id: pl.id,
          game_id: gameId,
          match_id: CHAMPION_BONUS_MATCH_ID,
          points: pl.champion_pick === actualChampion ? CHAMPION_BONUS : 0,
          prediction_home: null,
          prediction_away: null,
          actual_home: null,
          actual_away: null,
          predicted_winner_id: pl.champion_pick,
          actual_winner_id: actualChampion,
        }))

      if (bonusRows.length > 0) {
        await supabase
          .from('scores')
          .upsert(bonusRows, { onConflict: 'player_id,game_id,match_id' })
        championBonusAwarded = bonusRows.filter((r) => r.points > 0).length
      }
    }
  }

  // Snapshot the leaderboard
  await writeLeaderboardSnapshot(supabase, gameId, batch)

  // Automatic round transitions
  const predRound = getPredictionRoundForMatchId(submittedMatchIds[0])
  if (predRound) {
    await handleRoundTransition(supabase, gameId, predRound)
  }

  return {
    resultsEntered: resultRows.length,
    scoresComputed: scoreRows.length,
    championBonusAwarded,
  }
}

async function writeLeaderboardSnapshot(
  supabase: SupabaseClient,
  gameId: string,
  batch: RoundKey,
) {
  const [{ data: players }, { data: allScores }] = await Promise.all([
    supabase
      .from('players')
      .select('id, display_name, is_host')
      .eq('game_id', gameId),
    supabase
      .from('scores')
      .select('player_id, points, match_id')
      .eq('game_id', gameId),
  ])

  if (!players || players.length === 0) return

  const leaderboard = computeLeaderboard(players, allScores ?? [])

  const snapshotRows = leaderboard.map((entry) => ({
    game_id: gameId,
    batch,
    player_id: entry.playerId,
    rank: entry.rank,
    points: entry.totalPoints,
  }))

  await supabase
    .from('leaderboard_snapshots')
    .upsert(snapshotRows, { onConflict: 'game_id,batch,player_id' })
}

async function handleRoundTransition(
  supabase: SupabaseClient,
  gameId: string,
  predRound: PredictionRoundKey,
) {
  const [minId, maxId] = PREDICTION_ROUND_RANGES[predRound]
  const totalMatches = maxId - minId + 1

  const { count } = await supabase
    .from('official_results')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .gte('match_id', minId)
    .lte('match_id', maxId)

  if (count === totalMatches) {
    await supabase
      .from('game_rounds')
      .update({ status: 'scored', scored_at: new Date().toISOString() })
      .eq('game_id', gameId)
      .eq('round_key', predRound)

    const roundIdx = PREDICTION_ROUNDS.indexOf(predRound)
    if (roundIdx >= 0 && roundIdx < PREDICTION_ROUNDS.length - 1) {
      const nextRound = PREDICTION_ROUNDS[roundIdx + 1]
      await supabase
        .from('game_rounds')
        .update({ status: 'open', opened_at: new Date().toISOString() })
        .eq('game_id', gameId)
        .eq('round_key', nextRound)
        .eq('status', 'pending')
    }
  }
}
