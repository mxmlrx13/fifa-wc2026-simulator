import { createClient } from '@/lib/supabase/server'
import { getRoundForMatchId } from '@/lib/engine/rounds'
import { GROUP_MATCH_MAX_ID, TOTAL_MATCHES } from '@/lib/constants'

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

  if (game.predictions_locked) {
    return Response.json({ error: 'Predictions are locked' }, { status: 403 })
  }

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('game_id', game.id)
    .eq('auth_id', user.id)
    .single()

  if (!player) {
    return Response.json({ error: 'You are not in this game' }, { status: 403 })
  }

  const { predictions } = await request.json() as {
    predictions: Array<{
      matchId: number
      homeScore?: number
      awayScore?: number
      winnerId?: string
    }>
  }

  if (!predictions || !Array.isArray(predictions)) {
    return Response.json({ error: 'predictions array required' }, { status: 400 })
  }

  const rows = predictions
    .filter((p) => {
      if (p.matchId < 1 || p.matchId > TOTAL_MATCHES) return false
      if (p.matchId <= GROUP_MATCH_MAX_ID) return p.homeScore != null && p.awayScore != null
      return p.winnerId != null
    })
    .map((p) => ({
      player_id: player.id,
      game_id: game.id,
      match_id: p.matchId,
      round: getRoundForMatchId(p.matchId) ?? 'unknown',
      home_score: p.homeScore ?? null,
      away_score: p.awayScore ?? null,
      winner_id: p.winnerId ?? null,
    }))

  if (rows.length === 0) {
    return Response.json({ error: 'No valid predictions' }, { status: 400 })
  }

  const { error } = await supabase
    .from('predictions')
    .upsert(rows, { onConflict: 'player_id,game_id,match_id' })

  if (error) {
    return Response.json({ error: 'Failed to save predictions' }, { status: 500 })
  }

  return Response.json({ saved: rows.length })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!game) {
    return Response.json({ error: 'Game not found' }, { status: 404 })
  }

  const url = new URL(request.url)
  const round = url.searchParams.get('round')

  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentPlayer } = await supabase
    .from('players')
    .select('id')
    .eq('game_id', game.id)
    .eq('auth_id', user?.id ?? '')
    .single()

  let query = supabase
    .from('predictions')
    .select('player_id, match_id, home_score, away_score, winner_id')
    .eq('game_id', game.id)

  if (round) {
    query = query.eq('round', round)
  }

  const { data: predictions } = await query

  // If predictions not locked, only return current player's predictions
  if (!game.predictions_locked) {
    const own = predictions?.filter((p) => p.player_id === currentPlayer?.id) ?? []
    return Response.json({ predictions: own, locked: false })
  }

  return Response.json({ predictions: predictions ?? [], locked: true })
}
