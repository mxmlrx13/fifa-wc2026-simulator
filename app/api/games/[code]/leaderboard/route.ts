import { createClient } from '@/lib/supabase/server'

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

  const { data: players } = await supabase
    .from('players')
    .select('id, display_name, is_host')
    .eq('game_id', game.id)

  const { data: scores } = await supabase
    .from('scores')
    .select('player_id, points, match_id')
    .eq('game_id', game.id)

  // Aggregate scores per player
  const playerScores = new Map<string, { total: number; exact: number; matches: number }>()

  for (const p of players ?? []) {
    playerScores.set(p.id, { total: 0, exact: 0, matches: 0 })
  }

  for (const s of scores ?? []) {
    const current = playerScores.get(s.player_id)
    if (current) {
      current.total += s.points
      current.matches++
      if (s.points === 5) current.exact++
    }
  }

  const leaderboard = (players ?? [])
    .map((p) => {
      const stats = playerScores.get(p.id) ?? { total: 0, exact: 0, matches: 0 }
      return {
        playerId: p.id,
        displayName: p.display_name,
        isHost: p.is_host,
        totalPoints: stats.total,
        exactScores: stats.exact,
        matchesScored: stats.matches,
      }
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || b.exactScores - a.exactScores)

  return Response.json({ leaderboard })
}
