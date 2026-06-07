import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}): Promise<Metadata> {
  const { code } = await params
  const supabase = await createServiceClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, name')
    .eq('code', code.toUpperCase())
    .single()

  if (!game) {
    return { title: 'Game not found' }
  }

  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', game.id)

  const playerCount = count ?? 0
  const title = `Join "${game.name}" — WC2026 prediction game`
  const description = `${playerCount} player${playerCount !== 1 ? 's' : ''} · Code: ${code.toUpperCase()}`

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
  }
}

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return children
}
