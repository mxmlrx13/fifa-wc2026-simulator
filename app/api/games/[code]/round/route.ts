import { createClient } from '@/lib/supabase/server'
import type { RoundKey } from '@/lib/engine/rounds'

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
    .select('*')
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

  const { action, batch } = await request.json()

  if (action === 'lock') {
    const { error } = await supabase
      .from('games')
      .update({ predictions_locked: true })
      .eq('id', game.id)

    if (error) {
      return Response.json({ error: 'Failed to lock predictions' }, { status: 500 })
    }

    return Response.json({ success: true, predictions_locked: true })
  }

  if (action === 'set_result_batch') {
    if (!batch) {
      return Response.json({ error: 'batch parameter required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('games')
      .update({ current_round: batch })
      .eq('id', game.id)

    if (error) {
      return Response.json({ error: 'Failed to update batch' }, { status: 500 })
    }

    return Response.json({ success: true, current_round: batch })
  }

  return Response.json({ error: 'Invalid action. Use "lock" or "set_result_batch".' }, { status: 400 })
}
