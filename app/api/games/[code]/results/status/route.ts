import { createClient } from '@/lib/supabase/server'
import { getMatchIdsForRound, getAllRounds } from '@/lib/engine/rounds'

/**
 * GET /api/games/[code]/results/status
 *
 * Returns per-batch completion counts (how many official results exist).
 */
export async function GET(
  _request: Request,
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

  // Fetch all official results for this game
  const { data: allResults } = await supabase
    .from('official_results')
    .select('match_id')
    .eq('game_id', game.id)

  const resultMatchIds = new Set((allResults ?? []).map((r) => r.match_id))

  const batches: Record<string, { total: number; entered: number }> = {}

  for (const round of getAllRounds()) {
    const matchIds = getMatchIdsForRound(round)
    batches[round] = {
      total: matchIds.length,
      entered: matchIds.filter((id) => resultMatchIds.has(id)).length,
    }
  }

  return Response.json({ batches })
}
