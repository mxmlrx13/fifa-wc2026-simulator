import { createClient } from '@/lib/supabase/server'
import { PREDICTION_ROUNDS, type PredictionRoundKey } from '@/lib/constants'

const validRounds = new Set<string>(PREDICTION_ROUNDS)

export async function PATCH(
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
  const { data: player } = await supabase
    .from('players')
    .select('is_host')
    .eq('game_id', game.id)
    .eq('auth_id', user.id)
    .single()

  if (!player?.is_host) {
    return Response.json({ error: 'Only the host can manage rounds' }, { status: 403 })
  }

  const { action, roundKey } = await request.json() as {
    action: string
    roundKey?: PredictionRoundKey
  }

  if (!roundKey || !validRounds.has(roundKey)) {
    return Response.json({ error: 'Valid roundKey required' }, { status: 400 })
  }

  if (action === 'lock_round') {
    // Only lock rounds that are currently 'open'
    const { data: round } = await supabase
      .from('game_rounds')
      .select('status')
      .eq('game_id', game.id)
      .eq('round_key', roundKey)
      .single()

    if (!round) {
      return Response.json({ error: 'Round not found' }, { status: 404 })
    }

    if (round.status !== 'open') {
      return Response.json({ error: `Cannot lock round with status "${round.status}"` }, { status: 400 })
    }

    const { error } = await supabase
      .from('game_rounds')
      .update({ status: 'locked', locked_at: new Date().toISOString() })
      .eq('game_id', game.id)
      .eq('round_key', roundKey)

    if (error) {
      return Response.json({ error: 'Failed to lock round' }, { status: 500 })
    }

    return Response.json({ success: true, roundKey, status: 'locked' })
  }

  if (action === 'unlock_round') {
    // Only unlock rounds that are currently 'locked' (not scored)
    const { data: round } = await supabase
      .from('game_rounds')
      .select('status')
      .eq('game_id', game.id)
      .eq('round_key', roundKey)
      .single()

    if (!round) {
      return Response.json({ error: 'Round not found' }, { status: 404 })
    }

    if (round.status !== 'locked') {
      return Response.json({ error: `Cannot unlock round with status "${round.status}"` }, { status: 400 })
    }

    const { error } = await supabase
      .from('game_rounds')
      .update({ status: 'open', locked_at: null })
      .eq('game_id', game.id)
      .eq('round_key', roundKey)

    if (error) {
      return Response.json({ error: 'Failed to unlock round' }, { status: 500 })
    }

    return Response.json({ success: true, roundKey, status: 'open' })
  }

  return Response.json({ error: 'Invalid action. Use "lock_round" or "unlock_round".' }, { status: 400 })
}
