import { createClient } from '@/lib/supabase/server'
import { getMatchIdsForRound, getAllRounds, type RoundKey } from '@/lib/engine/rounds'
import { computePoints } from '@/lib/engine/scoring'

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
    .select('*')
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
    batch?: RoundKey
  }

  if (!results || !Array.isArray(results)) {
    return Response.json({ error: 'results array required' }, { status: 400 })
  }

  // Use batch to scope valid match IDs, or fall back to current_round
  const roundKey = batch ?? (game.current_round as RoundKey)

  // Validate batch key
  const validRounds = new Set<string>(getAllRounds())
  if (!validRounds.has(roundKey)) {
    return Response.json({ error: `Invalid batch key: "${roundKey}"` }, { status: 400 })
  }

  const validMatchIds = new Set(getMatchIdsForRound(roundKey))
  if (validMatchIds.size === 0) {
    return Response.json({ error: `No matches found for batch "${roundKey}"` }, { status: 400 })
  }

  const isKnockoutBatch = !roundKey.startsWith('group_md')

  // Check for knockout draws without explicit winner
  if (isKnockoutBatch) {
    const tiedWithoutWinner = results
      .filter((r) => validMatchIds.has(r.matchId))
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
    .filter((r) => validMatchIds.has(r.matchId))
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
  const batchMatchIds = resultRows.map((r) => r.match_id)
  const { data: predictions } = await supabase
    .from('predictions')
    .select('player_id, match_id, home_score, away_score, winner_id')
    .eq('game_id', game.id)
    .in('match_id', batchMatchIds)

  const resultMap = new Map(resultRows.map((r) => [r.match_id, r]))

  const scoreRows = (predictions ?? [])
    .filter((p) => resultMap.has(p.match_id))
    .map((p) => {
      const actual = resultMap.get(p.match_id)!

      if (isKnockoutBatch) {
        const actualWinnerId = actual.winner_id
        const predictedWinnerId = p.winner_id
        const points = (predictedWinnerId && actualWinnerId && predictedWinnerId === actualWinnerId) ? 3 : 0
        return {
          player_id: p.player_id,
          game_id: game.id,
          match_id: p.match_id,
          points,
          prediction_home: p.home_score,
          prediction_away: p.away_score,
          actual_home: actual.home_score,
          actual_away: actual.away_score,
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

  return Response.json({ resultsEntered: resultRows.length, scoresComputed: scoreRows.length })
}
