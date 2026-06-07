import { createClient } from '@/lib/supabase/server'
import { thirdPlaceSlots } from '@/lib/data/third-place-clusters'

const validSlotMatchIds = new Set(thirdPlaceSlots.map((s) => s.matchId))

/**
 * PATCH /api/games/[code]/bracket-overrides
 *
 * Host-only. Sets R32 third-place slot overrides.
 * Body: { overrides: { "matchId": "teamId", ... } }
 * Only allowed before R32 predictions are locked.
 */
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
    return Response.json({ error: 'Only the host can adjust R32 fixtures' }, { status: 403 })
  }

  // Check R32 is not locked yet
  const { data: r32Round } = await supabase
    .from('game_rounds')
    .select('status')
    .eq('game_id', game.id)
    .eq('round_key', 'r32')
    .single()

  if (r32Round?.status === 'locked' || r32Round?.status === 'scored') {
    return Response.json({
      error: 'R32 predictions are already locked — overrides cannot be changed',
    }, { status: 400 })
  }

  const { overrides } = await request.json() as {
    overrides: Record<string, string>
  }

  // Validate: every key must be a valid third-place slot matchId
  for (const key of Object.keys(overrides)) {
    if (!validSlotMatchIds.has(Number(key))) {
      return Response.json({
        error: `Invalid match ID ${key} — not a third-place R32 slot`,
      }, { status: 400 })
    }
  }

  const { error } = await supabase
    .from('games')
    .update({ r32_overrides: overrides })
    .eq('id', game.id)

  if (error) {
    return Response.json({ error: 'Failed to save overrides' }, { status: 500 })
  }

  return Response.json({ saved: true, overrides })
}
