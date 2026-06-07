import { createClient } from '@/lib/supabase/server'
import { computeLeaderboard, computeMovement } from '@/lib/engine/leaderboard'
import { getAllRounds, type RoundKey } from '@/lib/engine/rounds'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('code', code.toUpperCase())
    .single()

  if (!game) {
    return Response.json({ error: 'Game not found' }, { status: 404 })
  }

  const [{ data: players }, { data: scores }, { data: snapshots }] = await Promise.all([
    supabase
      .from('players')
      .select('id, display_name, is_host')
      .eq('game_id', game.id),
    supabase
      .from('scores')
      .select('player_id, points, match_id')
      .eq('game_id', game.id),
    supabase
      .from('leaderboard_snapshots')
      .select('batch, player_id, rank')
      .eq('game_id', game.id),
  ])

  const leaderboard = computeLeaderboard(players ?? [], scores ?? [])

  // Determine latest snapshot batch and compute movement
  const allRounds = getAllRounds()
  const snapshotBatches = new Set((snapshots ?? []).map((s) => s.batch))
  const latestBatch = [...allRounds].reverse().find((r) => snapshotBatches.has(r)) as RoundKey | undefined

  // Find the batch before the latest to compute movement
  let previousBatch: RoundKey | undefined
  if (latestBatch) {
    const idx = allRounds.indexOf(latestBatch)
    if (idx > 0) {
      // Find the most recent batch before the latest that has snapshots
      for (let i = idx - 1; i >= 0; i--) {
        if (snapshotBatches.has(allRounds[i])) {
          previousBatch = allRounds[i]
          break
        }
      }
    }
  }

  const prevSnapshot = previousBatch
    ? (snapshots ?? []).filter((s) => s.batch === previousBatch)
    : null
  const movement = computeMovement(leaderboard, prevSnapshot)

  const leaderboardWithMovement = leaderboard.map((entry) => ({
    ...entry,
    movement: movement.get(entry.playerId) ?? { direction: 'new' as const, delta: 0 },
  }))

  return Response.json({
    leaderboard: leaderboardWithMovement,
    latestBatch: latestBatch ?? null,
  })
}
