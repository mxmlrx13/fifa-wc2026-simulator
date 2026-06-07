import { createClient } from '@/lib/supabase/server'
import { GAME_CODE_LENGTH, CODE_GENERATION_RETRIES, PREDICTION_ROUNDS } from '@/lib/constants'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < GAME_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const { name, displayName } = body

  if (!name || !displayName) {
    return Response.json({ error: 'name and displayName required' }, { status: 400 })
  }

  // Generate unique code with retries
  let code = generateCode()
  let attempts = 0
  while (attempts < CODE_GENERATION_RETRIES) {
    const { data: existing } = await supabase
      .from('games')
      .select('id')
      .eq('code', code)
      .single()

    if (!existing) break
    code = generateCode()
    attempts++
  }

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({ code, name })
    .select()
    .single()

  if (gameError || !game) {
    return Response.json({ error: 'Failed to create game' }, { status: 500 })
  }

  // Create host player
  const { error: playerError } = await supabase
    .from('players')
    .insert({
      auth_id: user.id,
      game_id: game.id,
      display_name: displayName,
      is_host: true,
    })

  if (playerError) {
    return Response.json({ error: 'Failed to create host player' }, { status: 500 })
  }

  // Seed game_rounds: 'group' = 'open', rest = 'pending'
  const roundRows = PREDICTION_ROUNDS.map((roundKey) => ({
    game_id: game.id,
    round_key: roundKey,
    status: roundKey === 'group' ? 'open' : 'pending',
    opened_at: roundKey === 'group' ? new Date().toISOString() : null,
  }))

  const { error: roundsError } = await supabase.from('game_rounds').insert(roundRows)

  if (roundsError) {
    return Response.json({ error: 'Failed to create game rounds' }, { status: 500 })
  }

  return Response.json({ code: game.code, gameId: game.id })
}
