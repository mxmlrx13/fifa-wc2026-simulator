import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string; playerId: string }> },
) {
  const { code, playerId } = await params
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

  // Get the caller's player record
  const { data: caller } = await supabase
    .from('players')
    .select('id, is_host')
    .eq('game_id', game.id)
    .eq('auth_id', user.id)
    .single()

  if (!caller) {
    return Response.json({ error: 'You are not in this game' }, { status: 403 })
  }

  // Get the target player
  const { data: target } = await supabase
    .from('players')
    .select('id, is_host, display_name')
    .eq('id', playerId)
    .eq('game_id', game.id)
    .single()

  if (!target) {
    return Response.json({ error: 'Player not found in this game' }, { status: 404 })
  }

  const isSelf = caller.id === target.id
  const isHost = caller.is_host

  // Permission check: caller must be host (removing someone) or removing self
  if (!isSelf && !isHost) {
    return Response.json({ error: 'Only the host can remove other players' }, { status: 403 })
  }

  // Host cannot remove/leave themselves — must transfer first
  if (target.is_host) {
    return Response.json({
      error: 'The host cannot leave or be removed. Transfer host to another player first.',
    }, { status: 400 })
  }

  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', target.id)

  if (error) {
    return Response.json({ error: 'Failed to remove player' }, { status: 500 })
  }

  return Response.json({ removed: target.id, displayName: target.display_name })
}
