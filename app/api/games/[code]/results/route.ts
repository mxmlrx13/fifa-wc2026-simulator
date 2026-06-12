import { createClient } from '@/lib/supabase/server'
import { getMatchIdsForRound, getAllRounds, type RoundKey } from '@/lib/engine/rounds'
import { getPredictionRoundForMatchId } from '@/lib/constants'
import { applyResults } from '@/lib/results/apply-results'

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

  // Verify host
  const { data: hostPlayer } = await supabase
    .from('players')
    .select('is_host')
    .eq('game_id', game.id)
    .eq('auth_id', user.id)
    .single()

  if (!hostPlayer?.is_host) {
    return Response.json({ error: 'Only the host can enter results' }, { status: 403 })
  }

  const { results, batch } = await request.json() as {
    results: Array<{
      matchId: number
      homeScore: number
      awayScore: number
      winnerId?: string
    }>
    batch: RoundKey
  }

  if (!results || !Array.isArray(results)) {
    return Response.json({ error: 'results array required' }, { status: 400 })
  }

  if (!batch) {
    return Response.json({ error: 'batch parameter required' }, { status: 400 })
  }

  // Validate batch key
  const validRounds = new Set<string>(getAllRounds())
  if (!validRounds.has(batch)) {
    return Response.json({ error: `Invalid batch key: "${batch}"` }, { status: 400 })
  }

  // Check that the prediction round for this batch is locked or scored
  // (results can only be entered for locked/scored prediction rounds)
  const batchMatchIds = getMatchIdsForRound(batch)
  if (batchMatchIds.length === 0) {
    return Response.json({ error: `No matches found for batch "${batch}"` }, { status: 400 })
  }

  // Determine which prediction round this batch belongs to
  const predRound = getPredictionRoundForMatchId(batchMatchIds[0])
  if (predRound) {
    const { data: roundRow } = await supabase
      .from('game_rounds')
      .select('status')
      .eq('game_id', game.id)
      .eq('round_key', predRound)
      .single()

    if (roundRow && roundRow.status !== 'locked' && roundRow.status !== 'scored') {
      return Response.json({
        error: `Round "${predRound}" must be locked before entering results. Current status: "${roundRow.status}"`,
      }, { status: 400 })
    }
  }

  const validMatchIdSet = new Set(batchMatchIds)
  const isKnockoutBatch = !batch.startsWith('group_md')

  // Check for knockout draws without explicit winner
  if (isKnockoutBatch) {
    const tiedWithoutWinner = results
      .filter((r) => validMatchIdSet.has(r.matchId))
      .filter((r) => r.homeScore === r.awayScore && !r.winnerId)
      .map((r) => r.matchId)

    if (tiedWithoutWinner.length > 0) {
      return Response.json({
        error: 'Knockout matches that end in a draw require a winner (penalties). Select a winner for each tied match.',
        matchIds: tiedWithoutWinner,
      }, { status: 400 })
    }
  }

  // Delegate to shared scoring pipeline (identical logic, shared with auto-results)
  try {
    const output = await applyResults(supabase, game.id, results, batch)
    return Response.json(output)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to apply results' },
      { status: 500 },
    )
  }
}

export async function GET(
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
  const { data: hostPlayer } = await supabase
    .from('players')
    .select('is_host')
    .eq('game_id', game.id)
    .eq('auth_id', user.id)
    .single()

  if (!hostPlayer?.is_host) {
    return Response.json({ error: 'Only the host can view results' }, { status: 403 })
  }

  const url = new URL(request.url)
  const batch = url.searchParams.get('batch') as RoundKey | null

  if (!batch) {
    return Response.json({ results: [] })
  }

  const batchMatchIds = getMatchIdsForRound(batch)

  const { data: existingResults } = await supabase
    .from('official_results')
    .select('match_id, home_score, away_score, winner_id')
    .eq('game_id', game.id)
    .in('match_id', batchMatchIds)

  return Response.json({ results: existingResults ?? [] })
}

