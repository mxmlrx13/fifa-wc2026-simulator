import { createClient } from '@/lib/supabase/server'
import { computeTournament } from '@/lib/engine/tournament'
import { groupFixtures } from '@/lib/data/fixtures'
import { GROUP_MATCH_MAX_ID } from '@/lib/constants'

/**
 * GET /api/games/[code]/bracket
 *
 * Computes the actual bracket from official results entered so far.
 * Used by knockout prediction pages to show real matchups.
 */
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

  // Fetch all official results
  const { data: officialResults } = await supabase
    .from('official_results')
    .select('match_id, home_score, away_score, winner_id')
    .eq('game_id', game.id)

  // Build a TournamentState from official results
  const resultMap = new Map(
    (officialResults ?? []).map((r) => [r.match_id, r]),
  )

  // Build group matches from fixtures + official results
  const groupMatches = groupFixtures.map((fixture) => {
    const result = resultMap.get(fixture.id)
    return {
      ...fixture,
      homeScore: result?.home_score ?? null,
      awayScore: result?.away_score ?? null,
    }
  })

  // Build knockout picks from official results (match_id > 72)
  const knockoutPicks: Record<number, string> = {}
  for (const [matchId, result] of resultMap) {
    if (matchId > GROUP_MATCH_MAX_ID && result.winner_id) {
      knockoutPicks[matchId] = result.winner_id
    }
  }

  const state = {
    groupMatches,
    knockoutMatches: [],
    knockoutPicks,
  }

  const computed = computeTournament(state)

  return Response.json({
    knockoutMatches: computed.knockoutMatches,
    allGroupsComplete: computed.allGroupsComplete,
    champion: computed.champion,
  })
}
