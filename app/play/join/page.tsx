import JoinGameForm from '@/components/multiplayer/JoinGameForm'
import Link from 'next/link'

export default function JoinGamePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/play" className="mb-6 inline-block text-xs text-gray-500 hover:text-accent">
        &larr; Back
      </Link>
      <JoinGameForm />
    </div>
  )
}
