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

  const body = await request.json() as {
    action: string
    roundKey?: PredictionRoundKey
    playerId?: string
  }
  const { action } = body

  // Handle transfer_host separately (doesn't need roundKey)
  if (action === 'transfer_host') {
    const { playerId: targetId } = body
    if (!targetId) {
      return Response.json({ error: 'playerId required' }, { status: 400 })
    }

    // Verify target is a player in this game and not already host
    const { data: target } = await supabase
      .from('players')
      .select('id, is_host')
      .eq('id', targetId)
      .eq('game_id', game.id)
      .single()

    if (!target) {
      return Response.json({ error: 'Target player not found in this game' }, { status: 404 })
    }

    if (target.is_host) {
      return Response.json({ error: 'That player is already the host' }, { status: 400 })
    }

    // Get current host's player ID
    const { data: currentHost } = await supabase
      .from('players')
      .select('id')
      .eq('game_id', game.id)
      .eq('auth_id', user.id)
      .eq('is_host', true)
      .single()

    if (!currentHost) {
      return Response.json({ error: 'You are not the host' }, { status: 403 })
    }

    // Transfer: remove host from current, add to target
    // The one_host_per_game unique index ensures consistency
    const { error: removeErr } = await supabase
      .from('players')
      .update({ is_host: false })
      .eq('id', currentHost.id)

    if (removeErr) {
      return Response.json({ error: 'Failed to transfer host' }, { status: 500 })
    }

    const { error: addErr } = await supabase
      .from('players')
      .update({ is_host: true })
      .eq('id', targetId)

    if (addErr) {
      // Rollback: restore host to current player
      await supabase
        .from('players')
        .update({ is_host: true })
        .eq('id', currentHost.id)
      return Response.json({ error: 'Failed to transfer host' }, { status: 500 })
    }

    return Response.json({ success: true, newHostId: targetId })
  }

  const { roundKey } = body

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
