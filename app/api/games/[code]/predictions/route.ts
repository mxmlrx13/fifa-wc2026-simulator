import { createClient } from '@/lib/supabase/server'
import { getRoundForMatchId } from '@/lib/engine/rounds'
import {
  GROUP_MATCH_MAX_ID,
  TOTAL_MATCHES,
  getPredictionRoundForMatchId,
  type PredictionRoundKey,
} from '@/lib/constants'
import {
  DEADLINE_ENFORCEMENT_ENABLED,
  getPredictionRoundDeadline,
} from '@/lib/data/schedule'

export async function POST(
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

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('game_id', game.id)
    .eq('auth_id', user.id)
    .single()

  if (!player) {
    return Response.json({ error: 'You are not in this game' }, { status: 403 })
  }

  // Fetch open rounds for this game
  const { data: gameRounds } = await supabase
    .from('game_rounds')
    .select('round_key, status')
    .eq('game_id', game.id)

  const openRounds = new Set(
    (gameRounds ?? [])
      .filter((r) => r.status === 'open')
      .map((r) => r.round_key),
  )

  const body = await request.json()
  const { predictions, championPick } = body as {
    predictions?: Array<{
      matchId: number
      homeScore?: number
      awayScore?: number
      winnerId?: string
    }>
    championPick?: string
  }

  // Save champion pick if provided
  if (championPick !== undefined) {
    // Champion pick only allowed when 'group' round is open
    if (!openRounds.has('group')) {
      return Response.json({ error: 'Champion pick can only be set while group round is open' }, { status: 403 })
    }
    // Deadline backstop: reject if group deadline has passed (even if host forgot to lock)
    if (DEADLINE_ENFORCEMENT_ENABLED) {
      const groupDeadline = getPredictionRoundDeadline('group')
      if (new Date() >= groupDeadline) {
        return Response.json({
          error: `Champion pick deadline has passed (${groupDeadline.toISOString()})`,
        }, { status: 400 })
      }
    }
    const { error: champError } = await supabase
      .from('players')
      .update({ champion_pick: championPick })
      .eq('id', player.id)

    if (champError) {
      return Response.json({ error: 'Failed to save champion pick' }, { status: 500 })
    }

    // If no predictions, just return
    if (!predictions || predictions.length === 0) {
      return Response.json({ saved: 0, championPick })
    }
  }

  if (!predictions || !Array.isArray(predictions) || predictions.length === 0) {
    return Response.json({ error: 'predictions array required' }, { status: 400 })
  }

  // Filter predictions: only accept matches whose prediction round is 'open'
  // + deadline backstop when enforcement is enabled
  const rejected: number[] = []
  const deadlineRejectedRounds = new Set<string>()
  const now = new Date()
  const rows = predictions
    .filter((p) => {
      if (p.matchId < 1 || p.matchId > TOTAL_MATCHES) return false

      const predRound = getPredictionRoundForMatchId(p.matchId)
      if (!predRound || !openRounds.has(predRound)) {
        rejected.push(p.matchId)
        return false
      }

      // Deadline backstop: reject if this round's deadline has passed
      if (DEADLINE_ENFORCEMENT_ENABLED) {
        const deadline = getPredictionRoundDeadline(predRound)
        if (now >= deadline) {
          deadlineRejectedRounds.add(predRound)
          rejected.push(p.matchId)
          return false
        }
      }

      // Both group and knockout require home_score + away_score
      if (p.homeScore == null || p.awayScore == null) return false
      // Knockout: winnerId always required (client derives from score or shootout pick)
      if (p.matchId > GROUP_MATCH_MAX_ID) {
        if (!p.winnerId) return false
      }
      return true
    })
    .map((p) => ({
      player_id: player.id,
      game_id: game.id,
      match_id: p.matchId,
      round: getRoundForMatchId(p.matchId) ?? 'unknown',
      home_score: p.homeScore ?? null,
      away_score: p.awayScore ?? null,
      winner_id: p.winnerId ?? null,
    }))

  if (rows.length === 0) {
    const deadlineMsg = deadlineRejectedRounds.size > 0
      ? ` Deadline passed for: ${[...deadlineRejectedRounds].join(', ')}.`
      : ''
    return Response.json({
      error: `No valid predictions. All submitted matches belong to rounds that are not open.${deadlineMsg}`,
      rejected,
    }, { status: 400 })
  }

  const { error } = await supabase
    .from('predictions')
    .upsert(rows, { onConflict: 'player_id,game_id,match_id' })

  if (error) {
    return Response.json({ error: 'Failed to save predictions' }, { status: 500 })
  }

  return Response.json({ saved: rows.length, rejected })
}

export async function GET(
  request: Request,
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

  const url = new URL(request.url)
  const roundParam = url.searchParams.get('round') as PredictionRoundKey | null
  const completionParam = url.searchParams.get('completion')

  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentPlayer } = await supabase
    .from('players')
    .select('id')
    .eq('game_id', game.id)
    .eq('auth_id', user?.id ?? '')
    .single()

  // Completion mode: return per-player prediction counts (no prediction data)
  if (completionParam === 'true') {
    const completionRound = roundParam as PredictionRoundKey | null
    const [minId, maxId] = completionRound
      ? PREDICTION_ROUND_RANGES[completionRound]
      : [1, 72] // default to group stage

    const totalMatches = maxId - minId + 1

    const { data: allPlayers } = await supabase
      .from('players')
      .select('id')
      .eq('game_id', game.id)

    let query = supabase
      .from('predictions')
      .select('player_id, match_id')
      .eq('game_id', game.id)
      .gte('match_id', minId)
      .lte('match_id', maxId)

    const { data: counts } = await query

    const completionCounts: Record<string, number> = {}
    for (const p of allPlayers ?? []) {
      completionCounts[p.id] = (counts ?? []).filter((c) => c.player_id === p.id).length
    }

    return Response.json({ completionCounts, totalMatches })
  }

  // Fetch game rounds to determine visibility
  const { data: gameRounds } = await supabase
    .from('game_rounds')
    .select('round_key, status')
    .eq('game_id', game.id)

  const roundStatusMap = new Map(
    (gameRounds ?? []).map((r) => [r.round_key, r.status]),
  )

  // Locked/scored rounds are visible to all players
  const visibleRounds = new Set(
    (gameRounds ?? [])
      .filter((r) => r.status === 'locked' || r.status === 'scored')
      .map((r) => r.round_key),
  )

  let query = supabase
    .from('predictions')
    .select('player_id, match_id, home_score, away_score, winner_id')
    .eq('game_id', game.id)

  if (roundParam) {
    // Filter by prediction round's match range
    const { PREDICTION_ROUND_RANGES } = await import('@/lib/constants')
    const range = PREDICTION_ROUND_RANGES[roundParam]
    if (range) {
      query = query.gte('match_id', range[0]).lte('match_id', range[1])
    }
  }

  const { data: predictions } = await query

  // For each prediction, decide visibility:
  // - Own predictions: always visible
  // - Others' predictions: only if that prediction's round is locked or scored
  const filtered = (predictions ?? []).filter((p) => {
    if (p.player_id === currentPlayer?.id) return true
    const predRound = getPredictionRoundForMatchId(p.match_id)
    return predRound ? visibleRounds.has(predRound) : false
  })

  return Response.json({
    predictions: filtered,
    roundStatuses: Object.fromEntries(roundStatusMap),
  })
}
