import { createClient } from '@/lib/supabase/server'
import { schedule } from '@/lib/data/schedule'
import { groupFixtures } from '@/lib/data/fixtures'
import { GROUP_MATCH_MAX_ID } from '@/lib/constants'
import { computeTournament } from '@/lib/engine/tournament'
import { applyR32Overrides } from '@/lib/engine/knockout-bracket'

/**
 * GET /api/games/[code]/matchday
 *
 * Returns the 3 most recent completed matches (with results) and
 * the next 3 upcoming matches (no result yet) with all players' predictions.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const supabase = await createClient()

  const [{ data: game }, { data: { user } }] = await Promise.all([
    supabase
      .from('games')
      .select('id, r32_overrides')
      .eq('code', code.toUpperCase())
      .single(),
    supabase.auth.getUser(),
  ])

  if (!game) return Response.json({ error: 'Game not found' }, { status: 404 })
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  // Get current player + all official results for this game in parallel
  const [{ data: currentPlayer }, { data: allOfficialResults }] = await Promise.all([
    supabase
      .from('players')
      .select('id')
      .eq('game_id', game.id)
      .eq('auth_id', user.id)
      .single(),
    supabase
      .from('official_results')
      .select('match_id, home_score, away_score, winner_id')
      .eq('game_id', game.id),
  ])

  if (!currentPlayer) return Response.json({ error: 'Not in this game' }, { status: 403 })

  // Build set of match IDs that have official results
  const resultMatchIds = new Set((allOfficialResults ?? []).map((r) => r.match_id))

  // Sort all scheduled matches by kickoff
  const allScheduled = Object.entries(schedule)
    .map(([idStr, entry]) => ({ id: parseInt(idStr, 10), kickoff: entry.kickoffUtc }))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))

  // Recent: last 8 matches that have a result, sorted by kickoff desc
  const recentMatchIds = allScheduled
    .filter((m) => resultMatchIds.has(m.id))
    .slice(-8)
    .reverse()
    .map((m) => m.id)

  // Upcoming: next 8 matches without a result, sorted by kickoff asc
  const upcomingMatchIds = allScheduled
    .filter((m) => !resultMatchIds.has(m.id))
    .slice(0, 8)
    .map((m) => m.id)

  const allMatchIds = [...recentMatchIds, ...upcomingMatchIds]
  if (allMatchIds.length === 0) {
    return Response.json({ upcoming: [], recent: [], players: [] })
  }

  // Fetch all data in parallel
  const [
    { data: players },
    { data: predictions },
    { data: scores },
  ] = await Promise.all([
    supabase
      .from('players')
      .select('id, display_name, auth_id')
      .eq('game_id', game.id)
      .order('created_at'),
    supabase
      .from('predictions')
      .select('player_id, match_id, home_score, away_score, winner_id')
      .eq('game_id', game.id)
      .in('match_id', allMatchIds),
    supabase
      .from('scores')
      .select('player_id, match_id, points')
      .eq('game_id', game.id)
      .in('match_id', allMatchIds),
  ])

  // Resolve knockout teams via tournament engine
  const officialResultMap = new Map(
    (allOfficialResults ?? []).map((r) => [r.match_id, r]),
  )
  const groupMatches = groupFixtures.map((fixture) => {
    const result = officialResultMap.get(fixture.id)
    return {
      ...fixture,
      homeScore: result?.home_score ?? null,
      awayScore: result?.away_score ?? null,
    }
  })
  const knockoutPicks: Record<number, string> = {}
  for (const [matchId, result] of officialResultMap) {
    if (matchId > GROUP_MATCH_MAX_ID && result.winner_id) {
      knockoutPicks[matchId] = result.winner_id
    }
  }
  const computed = computeTournament({ groupMatches, knockoutMatches: [], knockoutPicks })
  const overrides = (game.r32_overrides ?? null) as Record<string, string> | null
  const knockoutMatches = overrides
    ? applyR32Overrides(computed.knockoutMatches, overrides)
    : computed.knockoutMatches
  const resolvedKnockout = new Map(
    knockoutMatches.map((m) => [m.id, m]),
  )

  // Build match info helper
  function getMatchInfo(matchId: number) {
    if (matchId <= GROUP_MATCH_MAX_ID) {
      const gf = groupFixtures.find((f) => f.id === matchId)
      if (gf) return { homeTeamId: gf.homeTeamId, awayTeamId: gf.awayTeamId, groupId: gf.groupId }
    } else {
      const ko = resolvedKnockout.get(matchId)
      if (ko) return { homeTeamId: ko.homeTeamId ?? null, awayTeamId: ko.awayTeamId ?? null, round: ko.round }
    }
    return null
  }

  // Build prediction and score maps
  const predByMatch = new Map<number, Array<{ playerId: string; homeScore: number | null; awayScore: number | null; winnerId: string | null }>>()
  for (const p of predictions ?? []) {
    const list = predByMatch.get(p.match_id) ?? []
    list.push({ playerId: p.player_id, homeScore: p.home_score, awayScore: p.away_score, winnerId: p.winner_id })
    predByMatch.set(p.match_id, list)
  }

  const resultMap = new Map((allOfficialResults ?? []).map((r) => [r.match_id, r]))
  const scoreMap = new Map<string, number>()
  for (const s of scores ?? []) {
    scoreMap.set(`${s.player_id}-${s.match_id}`, s.points)
  }

  // Build match entries
  function buildMatch(matchId: number) {
    const info = getMatchInfo(matchId)
    const sched = schedule[matchId]
    const result = resultMap.get(matchId)
    const preds = predByMatch.get(matchId) ?? []

    return {
      matchId,
      homeTeamId: info?.homeTeamId ?? null,
      awayTeamId: info?.awayTeamId ?? null,
      groupId: (info as { groupId?: string })?.groupId ?? null,
      kickoffUtc: sched?.kickoffUtc ?? null,
      venue: sched?.venue ?? null,
      result: result ? {
        homeScore: result.home_score,
        awayScore: result.away_score,
        winnerId: result.winner_id,
      } : null,
      predictions: preds.map((p) => ({
        playerId: p.playerId,
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        winnerId: p.winnerId,
        points: scoreMap.get(`${p.playerId}-${matchId}`) ?? null,
      })),
    }
  }

  // Already sorted: recent desc by kickoff, upcoming asc by kickoff
  const recentSorted = recentMatchIds.map(buildMatch)
  const upcomingSorted = upcomingMatchIds.map(buildMatch)

  const playerList = (players ?? []).map((p) => ({
    id: p.id,
    displayName: p.display_name,
    isCurrentUser: p.auth_id === user.id,
  }))

  return Response.json({
    upcoming: upcomingSorted,
    recent: recentSorted,
    players: playerList,
    currentPlayerId: currentPlayer.id,
  })
}
