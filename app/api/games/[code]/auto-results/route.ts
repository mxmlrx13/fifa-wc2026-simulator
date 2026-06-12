import { createClient } from '@/lib/supabase/server'
import { runAutoResultsForGame } from '@/lib/results/auto-results'

/** GET: current auto-results setting + pending suggestions count */
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
    .select('id, auto_results_enabled')
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
    return Response.json({ error: 'Only the host can manage auto-results' }, { status: 403 })
  }

  // Count pending suggestions
  const { count } = await supabase
    .from('result_suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('game_id', game.id)
    .eq('status', 'pending')

  return Response.json({
    enabled: game.auto_results_enabled ?? false,
    pendingSuggestions: count ?? 0,
  })
}

/** PATCH: toggle auto-results on/off */
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
    return Response.json({ error: 'Only the host can manage auto-results' }, { status: 403 })
  }

  const { enabled } = await request.json()

  if (typeof enabled !== 'boolean') {
    return Response.json({ error: 'enabled (boolean) required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('games')
    .update({ auto_results_enabled: enabled })
    .eq('id', game.id)

  if (error) {
    return Response.json({ error: 'Failed to update setting' }, { status: 500 })
  }

  return Response.json({ enabled })
}

/** POST: manually trigger auto-results fetch for this game */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: game } = await supabase
    .from('games')
    .select('id, auto_results_enabled')
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
    return Response.json({ error: 'Only the host can trigger auto-results' }, { status: 403 })
  }

  const log = await runAutoResultsForGame(supabase, game.id)
  return Response.json(log)
}
