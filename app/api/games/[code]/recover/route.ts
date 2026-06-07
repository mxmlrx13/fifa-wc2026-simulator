import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated. Please refresh and try again.' }, { status: 401 })
  }

  const { token } = await request.json()
  if (!token) {
    return Response.json({ error: 'Recovery token required' }, { status: 400 })
  }

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('code', code.toUpperCase())
    .single()

  if (!game) {
    return Response.json({ error: 'Game not found' }, { status: 404 })
  }

  // Find the player by recovery token in this game
  const { data: player } = await supabase
    .from('players')
    .select('id, display_name, is_host, game_id')
    .eq('recovery_token', token)
    .eq('game_id', game.id)
    .single()

  if (!player) {
    return Response.json({ error: 'Invalid recovery token for this game' }, { status: 404 })
  }

  // Update the player's auth_id to the caller's current session
  const { error } = await supabase
    .from('players')
    .update({ auth_id: user.id })
    .eq('id', player.id)

  if (error) {
    return Response.json({ error: 'Failed to recover access' }, { status: 500 })
  }

  return Response.json({
    playerId: player.id,
    displayName: player.display_name,
    isHost: player.is_host,
  })
}
