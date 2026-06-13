import { createClient } from '@/lib/supabase/server'
import { schedule } from '@/lib/data/schedule'
import { groupFixtures } from '@/lib/data/fixtures'
import { bracketTemplate } from '@/lib/data/bracket-template'
import { GROUP_MATCH_MAX_ID } from '@/lib/constants'

/**
 * GET /api/games/[code]/matchday
 *
 * Returns today's matches and recent completed matches with predictions
 * from all players in the game.
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
      .select('id')
      .eq('code', code.toUpperCase())
      .single(),
    supabase.auth.getUser(),
  ])

  if (!game) return Response.json({ error: 'Game not found' }, { status: 404 })
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  // Get current player
  const { data: currentPlayer } = await supabase
    .from('players')
    .select('id')
    .eq('game_id', game.id)
    .eq('auth_id', user.id)
    .single()

  if (!currentPlayer) return Response.json({ error: 'Not in this game' }, { status: 403 })

  // Determine today's date range (in UTC)
  const now = new Date()
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  // Find today's match IDs and recent past match IDs from schedule
  const todayMatchIds: number[] = []
  const pastMatchIds: { id: number; kickoff: string }[] = []

  for (const [idStr, entry] of Object.entries(schedule)) {
    const matchId = parseInt(idStr, 10)
    const kickoff = new Date(entry.kickoffUtc)

    if (kickoff >= todayStart && kickoff < todayEnd) {
      todayMatchIds.push(matchId)
    } else if (kickoff < todayStart) {
      pastMatchIds.push({ id: matchId, kickoff: entry.kickoffUtc })
    }
  }

  // Sort past matches by kickoff desc and take the last 5
  pastMatchIds.sort((a, b) => b.kickoff.localeCompare(a.kickoff))
  const recentMatchIds = pastMatchIds.slice(0, 5).map((m) => m.id)

  const allMatchIds = [...todayMatchIds, ...recentMatchIds]
  if (allMatchIds.length === 0) {
    return Response.json({ today: [], recent: [], players: [] })
  }

  // Fetch all data in parallel
  const [
    { data: players },
    { data: predictions },
    { data: officialResults },
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
      .from('official_results')
      .select('match_id, home_score, away_score, winner_id')
      .eq('game_id', game.id)
      .in('match_id', allMatchIds),
    supabase
      .from('scores')
      .select('player_id, match_id, points')
      .eq('game_id', game.id)
      .in('match_id', allMatchIds),
  ])

  // Build match info helper
  function getMatchInfo(matchId: number) {
    if (matchId <= GROUP_MATCH_MAX_ID) {
      const gf = groupFixtures.find((f) => f.id === matchId)
      if (gf) return { homeTeamId: gf.homeTeamId, awayTeamId: gf.awayTeamId, groupId: gf.groupId }
    } else {
      const ko = bracketTemplate.find((f) => f.id === matchId)
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

  const resultMap = new Map((officialResults ?? []).map((r) => [r.match_id, r]))
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

  // Sort today's matches by kickoff time
  const todaySorted = todayMatchIds
    .sort((a, b) => (schedule[a]?.kickoffUtc ?? '').localeCompare(schedule[b]?.kickoffUtc ?? ''))
    .map(buildMatch)

  // Recent matches already sorted desc by kickoff
  const recentSorted = recentMatchIds.map(buildMatch)

  const playerList = (players ?? []).map((p) => ({
    id: p.id,
    displayName: p.display_name,
    isCurrentUser: p.auth_id === user.id,
  }))

  return Response.json({
    today: todaySorted,
    recent: recentSorted,
    players: playerList,
    currentPlayerId: currentPlayer.id,
  })
}
