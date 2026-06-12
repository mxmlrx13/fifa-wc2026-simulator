import { createClient } from '@/lib/supabase/server'
import { applyResults } from '@/lib/results/apply-results'
import { getRoundForMatchId } from '@/lib/engine/rounds'

/** GET: list suggestions for this game */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('code', code.toUpperCase())
    .single()

  if (!game) return Response.json({ error: 'Game not found' }, { status: 404 })

  const { data: hostPlayer } = await supabase
    .from('players')
    .select('is_host')
    .eq('game_id', game.id)
    .eq('auth_id', user.id)
    .single()

  if (!hostPlayer?.is_host) {
    return Response.json({ error: 'Host only' }, { status: 403 })
  }

  const { data: suggestions } = await supabase
    .from('result_suggestions')
    .select('*')
    .eq('game_id', game.id)
    .order('match_id', { ascending: true })

  return Response.json({ suggestions: suggestions ?? [] })
}

/** PATCH: approve or dismiss a suggestion */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('code', code.toUpperCase())
    .single()

  if (!game) return Response.json({ error: 'Game not found' }, { status: 404 })

  const { data: hostPlayer } = await supabase
    .from('players')
    .select('is_host')
    .eq('game_id', game.id)
    .eq('auth_id', user.id)
    .single()

  if (!hostPlayer?.is_host) {
    return Response.json({ error: 'Host only' }, { status: 403 })
  }

  const { suggestionId, action, homeScore, awayScore, winnerId } = await request.json()

  if (!suggestionId || !['approve', 'dismiss'].includes(action)) {
    return Response.json({ error: 'suggestionId and action (approve|dismiss) required' }, { status: 400 })
  }

  const { data: suggestion } = await supabase
    .from('result_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .eq('game_id', game.id)
    .single()

  if (!suggestion) {
    return Response.json({ error: 'Suggestion not found' }, { status: 404 })
  }

  if (suggestion.status !== 'pending') {
    return Response.json({ error: 'Suggestion already resolved' }, { status: 400 })
  }

  if (action === 'dismiss') {
    await supabase
      .from('result_suggestions')
      .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
      .eq('id', suggestionId)

    return Response.json({ status: 'dismissed' })
  }

  // Approve: use edited scores if provided, otherwise use suggestion scores
  const finalHome = homeScore ?? suggestion.home_score
  const finalAway = awayScore ?? suggestion.away_score
  const finalWinner = winnerId ?? suggestion.winner_id

  if (finalHome == null || finalAway == null) {
    return Response.json({ error: 'Scores required' }, { status: 400 })
  }

  const batch = getRoundForMatchId(suggestion.match_id)
  if (!batch) {
    return Response.json({ error: 'Cannot determine batch for match' }, { status: 400 })
  }

  try {
    await applyResults(supabase, game.id, [{
      matchId: suggestion.match_id,
      homeScore: finalHome,
      awayScore: finalAway,
      winnerId: finalWinner ?? undefined,
    }], batch)

    await supabase
      .from('result_suggestions')
      .update({
        status: 'host_applied',
        home_score: finalHome,
        away_score: finalAway,
        winner_id: finalWinner,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', suggestionId)

    return Response.json({ status: 'host_applied' })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to apply' },
      { status: 500 },
    )
  }
}
