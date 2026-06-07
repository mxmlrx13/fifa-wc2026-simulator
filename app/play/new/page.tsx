import CreateGameForm from '@/components/multiplayer/CreateGameForm'
import Link from 'next/link'

export default function NewGamePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/play" className="mb-6 inline-block text-[11px] text-muted hover:text-ink">
        &larr; Back
      </Link>
      <CreateGameForm />
    </div>
  )
}
