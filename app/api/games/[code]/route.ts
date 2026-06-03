import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const supabase = await createClient()

  const { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !game) {
    return Response.json({ error: 'Game not found' }, { status: 404 })
  }

  const { data: players } = await supabase
    .from('players')
    .select('id, display_name, is_host, auth_id')
    .eq('game_id', game.id)
    .order('created_at')

  // Check if current user is a player / host
  const { data: { user } } = await supabase.auth.getUser()
  const currentPlayer = players?.find((p) => p.auth_id === user?.id) ?? null

  return Response.json({
    game,
    players: players?.map((p) => ({
      id: p.id,
      displayName: p.display_name,
      isHost: p.is_host,
    })) ?? [],
    currentPlayer: currentPlayer ? {
      id: currentPlayer.id,
      displayName: currentPlayer.display_name,
      isHost: currentPlayer.is_host,
    } : null,
  })
}
