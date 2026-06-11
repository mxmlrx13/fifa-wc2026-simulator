import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('players')
    .select('game:games(code, name)')
    .eq('auth_id', user.id)

  if (error) {
    return Response.json({ error: 'Failed to fetch games' }, { status: 500 })
  }

  const games = data
    .map((row) => {
      const game = row.game as unknown as { code: string; name: string } | null
      return game ? { code: game.code, name: game.name } : null
    })
    .filter(Boolean)

  return Response.json({ games })
}
