'use client'

import { use, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ensureAnonymousSession } from '@/lib/supabase/auth'

export default function RecoverPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const message = searchParams.get('message')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleRecover() {
    if (!token) return
    setLoading(true)
    setError(null)

    try {
      await ensureAnonymousSession()

      const res = await fetch(`/api/games/${code}/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Recovery failed')
        return
      }

      setSuccess(true)
      setTimeout(() => router.push(`/play/${code}`), 1500)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm font-medium text-red">No recovery token provided.</p>
        <p className="max-w-md text-center text-[13.5px] text-muted">
          To recover your account, use the recovery link you saved when you created or joined the game.
        </p>
        <Link href={`/play/${code}`} className="text-[11px] text-navy hover:underline">
          Go to game
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <div className="mx-auto max-w-md space-y-4 rounded-[var(--radius-card)] border border-line bg-card p-6 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-[17px] font-bold text-ink">Recover Your Access</h1>

        {message && (
          <p className="rounded-lg bg-third-soft px-3 py-2 text-xs text-third-ink">
            {message}
          </p>
        )}

        <p className="text-[13.5px] text-muted">
          This will link your player account in game <strong className="text-ink">{code}</strong> to your current browser session.
          If you had a previous session on another device or browser, it will no longer be connected to this player.
        </p>

        {error && <p className="text-xs font-medium text-red">{error}</p>}

        {success ? (
          <p className="text-sm font-bold text-win-ink">Access restored! Redirecting...</p>
        ) : (
          <button
            onClick={handleRecover}
            disabled={loading}
            className="w-full rounded-[var(--radius-button)] bg-navy px-4 py-3 text-sm font-bold text-paper transition-all hover:brightness-94 disabled:opacity-50"
          >
            {loading ? 'Restoring...' : 'Restore My Access'}
          </button>
        )}
      </div>

      <Link href={`/play/${code}`} className="text-[11px] text-muted hover:text-ink">
        Back to game
      </Link>
    </div>
  )
}
