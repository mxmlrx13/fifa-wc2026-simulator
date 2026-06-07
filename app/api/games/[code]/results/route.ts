import { createClient } from '@/lib/supabase/server'
import { getMatchIdsForRound, getAllRounds, type RoundKey } from '@/lib/engine/rounds'
import { computePoints } from '@/lib/engine/scoring'
import { computeLeaderboard } from '@/lib/engine/leaderboard'
import {
  getPredictionRoundForMatchId,
  getKnockoutPointsForMatch,
  KNOCKOUT_EXACT_BONUS,
  PREDICTION_ROUNDS,
  FINAL_MATCH_ID,
  CHAMPION_BONUS,
  CHAMPION_BONUS_MATCH_ID,
  type PredictionRoundKey,
} from '@/lib/constants'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('code', code.toUpperCase())
    .single()

  if (!game) {
    return Response.json({ error: 'Game not found' }, { status: 404 })
  }

  // Verify host
  const { data: hostPlayer } = await supabase
    .from('players')
    .select('is_host')
    .eq('game_id', game.id)
    .eq('auth_id', user.id)
    .single()

  if (!hostPlayer?.is_host) {
    return Response.json({ error: 'Only the host can enter results' }, { status: 403 })
  }

  const { results, batch } = await request.json() as {
    results: Array<{
      matchId: number
      homeScore: number
      awayScore: number
      winnerId?: string
    }>
    batch: RoundKey
  }

  if (!results || !Array.isArray(results)) {
    return Response.json({ error: 'results array required' }, { status: 400 })
  }

  if (!batch) {
    return Response.json({ error: 'batch parameter required' }, { status: 400 })
  }

  // Validate batch key
  const validRounds = new Set<string>(getAllRounds())
  if (!validRounds.has(batch)) {
    return Response.json({ error: `Invalid batch key: "${batch}"` }, { status: 400 })
  }

  // Check that the prediction round for this batch is locked or scored
  // (results can only be entered for locked/scored prediction rounds)
  const batchMatchIds = getMatchIdsForRound(batch)
  if (batchMatchIds.length === 0) {
    return Response.json({ error: `No matches found for batch "${batch}"` }, { status: 400 })
  }

  // Determine which prediction round this batch belongs to
  const predRound = getPredictionRoundForMatchId(batchMatchIds[0])
  if (predRound) {
    const { data: roundRow } = await supabase
      .from('game_rounds')
      .select('status')
      .eq('game_id', game.id)
      .eq('round_key', predRound)
      .single()

    if (roundRow && roundRow.status !== 'locked' && roundRow.status !== 'scored') {
      return Response.json({
        error: `Round "${predRound}" must be locked before entering results. Current status: "${roundRow.status}"`,
      }, { status: 400 })
    }
  }

  const validMatchIdSet = new Set(batchMatchIds)
  const isKnockoutBatch = !batch.startsWith('group_md')

  // Check for knockout draws without explicit winner
  if (isKnockoutBatch) {
    const tiedWithoutWinner = results
      .filter((r) => validMatchIdSet.has(r.matchId))
      .filter((r) => r.homeScore === r.awayScore && !r.winnerId)
      .map((r) => r.matchId)

    if (tiedWithoutWinner.length > 0) {
      return Response.json({
        error: 'Knockout matches that end in a draw require a winner (penalties). Select a winner for each tied match.',
        matchIds: tiedWithoutWinner,
      }, { status: 400 })
    }
  }

  // Build official result rows
  const resultRows = results
    .filter((r) => validMatchIdSet.has(r.matchId))
    .map((r) => ({
      game_id: game.id,
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
    return Response.json({ error: 'Failed to save results' }, { status: 500 })
  }

  // Compute scores for all players
  const submittedMatchIds = resultRows.map((r) => r.match_id)
  const { data: predictions } = await supabase
    .from('predictions')
    .select('player_id, match_id, home_score, away_score, winner_id')
    .eq('game_id', game.id)
    .in('match_id', submittedMatchIds)

  const resultMap = new Map(resultRows.map((r) => [r.match_id, r]))

  const scoreRows = (predictions ?? [])
    .filter((p) => resultMap.has(p.match_id))
    .map((p) => {
      const actual = resultMap.get(p.match_id)!

      if (isKnockoutBatch) {
        const actualWinnerId = actual.winner_id
        const predictedWinnerId = p.winner_id
        const correctWinner = !!(predictedWinnerId && actualWinnerId && predictedWinnerId === actualWinnerId)
        let points = 0
        if (correctWinner) {
          points = getKnockoutPointsForMatch(p.match_id)
          // Exact scoreline bonus
          if (p.home_score === actual.home_score && p.away_score === actual.away_score) {
            points += KNOCKOUT_EXACT_BONUS
          }
        }
        return {
          player_id: p.player_id,
          game_id: game.id,
          match_id: p.match_id,
          points,
          prediction_home: p.home_score,
          prediction_away: p.away_score,
          actual_home: actual.home_score,
          actual_away: actual.away_score,
          predicted_winner_id: predictedWinnerId,
          actual_winner_id: actualWinnerId,
        }
      }

      if (p.home_score === null || p.away_score === null) {
        return {
          player_id: p.player_id,
          game_id: game.id,
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
        game_id: game.id,
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
      return Response.json({ error: 'Failed to compute scores' }, { status: 500 })
    }
  }

  // Champion bonus: if the final (match 104) result was just entered,
  // award bonus to players who correctly picked the champion
  let championBonusAwarded = 0
  if (submittedMatchIds.includes(FINAL_MATCH_ID)) {
    const finalResult = resultMap.get(FINAL_MATCH_ID)
    if (finalResult?.winner_id) {
      const actualChampion = finalResult.winner_id
      const { data: allPlayers } = await supabase
        .from('players')
        .select('id, champion_pick')
        .eq('game_id', game.id)

      const bonusRows = (allPlayers ?? [])
        .filter((pl) => pl.champion_pick != null)
        .map((pl) => ({
          player_id: pl.id,
          game_id: game.id,
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

  // Snapshot the leaderboard for this batch
  await writeLeaderboardSnapshot(supabase, game.id, batch)

  // Automatic round transitions:
  // Check if all matches in the prediction round now have results.
  // If so, mark the round as 'scored' and open the next round.
  if (predRound) {
    await handleRoundTransition(supabase, game.id, predRound)
  }

  return Response.json({
    resultsEntered: resultRows.length,
    scoresComputed: scoreRows.length,
    championBonusAwarded,
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('code', code.toUpperCase())
    .single()

  if (!game) {
    return Response.json({ error: 'Game not found' }, { status: 404 })
  }

  // Verify host
  const { data: hostPlayer } = await supabase
    .from('players')
    .select('is_host')
    .eq('game_id', game.id)
    .eq('auth_id', user.id)
    .single()

  if (!hostPlayer?.is_host) {
    return Response.json({ error: 'Only the host can view results' }, { status: 403 })
  }

  const url = new URL(request.url)
  const batch = url.searchParams.get('batch') as RoundKey | null

  if (!batch) {
    return Response.json({ results: [] })
  }

  const batchMatchIds = getMatchIdsForRound(batch)

  const { data: existingResults } = await supabase
    .from('official_results')
    .select('match_id, home_score, away_score, winner_id')
    .eq('game_id', game.id)
    .in('match_id', batchMatchIds)

  return Response.json({ results: existingResults ?? [] })
}

async function writeLeaderboardSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gameId: string,
  batch: RoundKey,
) {
  // Fetch all players and all scores for the game
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  gameId: string,
  predRound: PredictionRoundKey,
) {
  // Get all match IDs for this prediction round
  const { PREDICTION_ROUND_RANGES } = await import('@/lib/constants')
  const [minId, maxId] = PREDICTION_ROUND_RANGES[predRound]
  const totalMatches = maxId - minId + 1

  // Count how many official results exist for this range
  const { count } = await supabase
    .from('official_results')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .gte('match_id', minId)
    .lte('match_id', maxId)

  if (count === totalMatches) {
    // All results entered — mark round as scored
    await supabase
      .from('game_rounds')
      .update({ status: 'scored', scored_at: new Date().toISOString() })
      .eq('game_id', gameId)
      .eq('round_key', predRound)

    // Open next round if it's still 'pending'
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
