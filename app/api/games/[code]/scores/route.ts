import { createClient } from '@/lib/supabase/server'
import {
  PREDICTION_ROUNDS,
  PREDICTION_ROUND_RANGES,
  CHAMPION_BONUS_MATCH_ID,
  type PredictionRoundKey,
} from '@/lib/constants'

/**
 * GET /api/games/[code]/scores
 *
 * Returns per-match scores, predictions, official results, champion pick, and champion bonus.
 *
 * Query params:
 *   ?playerId=X  — return that player's data (only for scored rounds)
 *   (none)       — return current user's data
 */
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

  // Current player (the caller)
  const { data: currentPlayer } = await supabase
    .from('players')
    .select('id')
    .eq('game_id', game.id)
    .eq('auth_id', user.id)
    .single()

  if (!currentPlayer) {
    return Response.json({ error: 'Not in this game' }, { status: 403 })
  }

  // Determine which player's data to return
  const url = new URL(request.url)
  const requestedPlayerId = url.searchParams.get('playerId')
  const isOwnData = !requestedPlayerId || requestedPlayerId === currentPlayer.id
  const targetPlayerId = requestedPlayerId ?? currentPlayer.id

  // If viewing another player, validate they exist in this game
  if (!isOwnData) {
    const { data: targetPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('game_id', game.id)
      .eq('id', targetPlayerId)
      .single()

    if (!targetPlayer) {
      return Response.json({ error: 'Player not found in this game' }, { status: 404 })
    }
  }

  // Fetch game rounds to determine which rounds are scored
  const { data: gameRounds } = await supabase
    .from('game_rounds')
    .select('round_key, status')
    .eq('game_id', game.id)

  const roundStatusMap: Record<string, string> = {}
  for (const r of gameRounds ?? []) {
    roundStatusMap[r.round_key] = r.status
  }

  // Build the set of match IDs visible for this request
  // For own data: all match IDs (no restriction)
  // For other player: only scored rounds
  let allowedMatchIds: Set<number> | null = null // null = all allowed
  if (!isOwnData) {
    allowedMatchIds = new Set<number>()
    for (const round of PREDICTION_ROUNDS) {
      if (roundStatusMap[round] === 'locked' || roundStatusMap[round] === 'scored') {
        const [min, max] = PREDICTION_ROUND_RANGES[round]
        for (let i = min; i <= max; i++) {
          allowedMatchIds.add(i)
        }
      }
    }
    // Champion bonus is visible if the final round is scored
    if (roundStatusMap['final'] === 'scored') {
      allowedMatchIds.add(CHAMPION_BONUS_MATCH_ID)
    }
  }

  // Fetch scores
  const { data: allScores } = await supabase
    .from('scores')
    .select('match_id, points')
    .eq('game_id', game.id)
    .eq('player_id', targetPlayerId)

  // Fetch predictions
  const { data: allPredictions } = await supabase
    .from('predictions')
    .select('match_id, home_score, away_score, winner_id')
    .eq('game_id', game.id)
    .eq('player_id', targetPlayerId)

  // Fetch official results
  const { data: allOfficialResults } = await supabase
    .from('official_results')
    .select('match_id, home_score, away_score, winner_id')
    .eq('game_id', game.id)

  // Filter to allowed match IDs
  const filterByAllowed = <T extends { match_id: number }>(items: T[]): T[] => {
    if (!allowedMatchIds) return items
    return items.filter((item) => allowedMatchIds.has(item.match_id))
  }

  const scores = filterByAllowed(allScores ?? [])
  const predictions = filterByAllowed(allPredictions ?? [])
  // Official results are always filtered the same way (only show results for visible rounds)
  const officialResults = filterByAllowed(allOfficialResults ?? [])

  // Fetch champion pick
  const { data: targetPlayerData } = await supabase
    .from('players')
    .select('champion_pick')
    .eq('game_id', game.id)
    .eq('id', targetPlayerId)
    .single()

  const championPick = targetPlayerData?.champion_pick ?? null

  // Champion bonus: look for match_id = 0 in scores
  const championBonusRow = scores.find((s) => s.match_id === CHAMPION_BONUS_MATCH_ID)
  const championBonus = championBonusRow?.points ?? null

  return Response.json({
    scores,
    predictions,
    officialResults,
    championPick,
    championBonus,
  })
}
