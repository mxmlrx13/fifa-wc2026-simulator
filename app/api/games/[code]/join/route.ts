import { createClient } from '@/lib/supabase/server'

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

  const { displayName } = await request.json()
  if (!displayName) {
    return Response.json({ error: 'displayName required' }, { status: 400 })
  }

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('code', code.toUpperCase())
    .single()

  if (!game) {
    return Response.json({ error: 'Game not found' }, { status: 404 })
  }

  // Check if already joined
  const { data: existing } = await supabase
    .from('players')
    .select('id')
    .eq('game_id', game.id)
    .eq('auth_id', user.id)
    .single()

  if (existing) {
    return Response.json({ playerId: existing.id, alreadyJoined: true })
  }

  const { data: player, error } = await supabase
    .from('players')
    .insert({
      auth_id: user.id,
      game_id: game.id,
      display_name: displayName,
      is_host: false,
    })
    .select('id, recovery_token')
    .single()

  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'Display name already taken in this game' }, { status: 409 })
    }
    return Response.json({ error: 'Failed to join game' }, { status: 500 })
  }

  if (!player) {
    return Response.json({ error: 'Player was created but could not be retrieved' }, { status: 500 })
  }

  return Response.json({ playerId: player.id, recoveryToken: player.recovery_token })
}
