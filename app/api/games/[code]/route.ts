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

  const [{ data: players }, { data: gameRounds }, { data: { user } }] = await Promise.all([
    supabase
      .from('players')
      .select('id, display_name, is_host, auth_id, champion_pick, recovery_token')
      .eq('game_id', game.id)
      .order('created_at'),
    supabase
      .from('game_rounds')
      .select('round_key, status')
      .eq('game_id', game.id)
      .order('opened_at', { nullsFirst: false }),
    supabase.auth.getUser(),
  ])
  const currentPlayer = players?.find((p) => p.auth_id === user?.id) ?? null

  // Order rounds by PREDICTION_ROUNDS order
  const roundOrder = ['group', 'r32', 'r16', 'qf', 'sf', 'final']
  const rounds = (gameRounds ?? [])
    .sort((a, b) => roundOrder.indexOf(a.round_key) - roundOrder.indexOf(b.round_key))
    .map((r) => ({ roundKey: r.round_key, status: r.status }))

  return Response.json({
    game: { id: game.id, code: game.code, name: game.name },
    players: players?.map((p) => ({
      id: p.id,
      displayName: p.display_name,
      isHost: p.is_host,
      championPick: p.champion_pick,
    })) ?? [],
    currentPlayer: currentPlayer ? {
      id: currentPlayer.id,
      displayName: currentPlayer.display_name,
      isHost: currentPlayer.is_host,
      championPick: currentPlayer.champion_pick,
      recoveryToken: currentPlayer.recovery_token,
    } : null,
    rounds,
  })
}
