'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ensureAnonymousSession } from '@/lib/supabase/auth'

export default function CreateGameForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await ensureAnonymousSession()

      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, displayName }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create game')
        return
      }

      router.push(`/play/${data.code}`)
    } catch (err) {
      console.error('CreateGameForm error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card mx-auto max-w-md space-y-4 p-6">
      <h2 className="text-lg font-bold text-accent">Create a Game</h2>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">
          Game Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Smith Family Pool"
          required
          className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-foreground placeholder-gray-400 outline-none transition-all focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent),0_0_12px_var(--color-accent-glow)]"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">
          Your Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Maxime"
          required
          className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-foreground placeholder-gray-400 outline-none transition-all focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent),0_0_12px_var(--color-accent-glow)]"
        />
      </div>

      {error && <p className="text-xs text-neon-red">{error}</p>}

      <button
        type="submit"
        disabled={loading || !name || !displayName}
        className="w-full rounded-lg bg-accent/20 px-4 py-2.5 text-sm font-bold text-accent transition-all hover:bg-accent/30 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Game'}
      </button>
    </form>
  )
}
