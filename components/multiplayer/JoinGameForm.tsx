'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ensureAnonymousSession } from '@/lib/supabase/auth'
import { registerGame } from '@/lib/hooks/use-game-registry'
import RecoveryLinkModal from './RecoveryLinkModal'

interface JoinGameFormProps {
  initialCode?: string
}

export default function JoinGameForm({ initialCode }: JoinGameFormProps) {
  const router = useRouter()
  const [code, setCode] = useState(initialCode ?? '')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recovery, setRecovery] = useState<{ code: string; token: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await ensureAnonymousSession()

      const upperCode = code.toUpperCase()
      const res = await fetch(`/api/games/${upperCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to join game')
        return
      }

      registerGame(upperCode, upperCode)

      if (data.alreadyJoined) {
        router.push(`/play/${upperCode}`)
        return
      }

      // Show recovery modal before navigating
      if (data.recoveryToken) {
        setRecovery({ code: upperCode, token: data.recoveryToken })
      } else {
        router.push(`/play/${upperCode}`)
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (recovery) {
    return (
      <RecoveryLinkModal
        code={recovery.code}
        recoveryToken={recovery.token}
        onClose={() => router.push(`/play/${recovery.code}`)}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4 rounded-[var(--radius-card)] border border-line bg-card p-6">
      <h2 className="font-[family-name:var(--font-display)] text-[17px] font-bold text-ink">Join a Game</h2>

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
          Game Code
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. WC26AB"
          maxLength={6}
          required
          className="w-full rounded-[var(--radius-input)] border border-line bg-input px-3 py-2.5 text-center font-mono text-lg font-bold tracking-[0.3em] text-ink placeholder-muted/60 outline-none transition-all focus:border-navy"
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
          Your Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Maxime"
          required
          className="w-full rounded-[var(--radius-input)] border border-line bg-input px-3 py-2.5 text-sm text-ink placeholder-muted/60 outline-none transition-all focus:border-navy"
        />
      </div>

      {error && <p className="text-xs font-medium text-red">{error}</p>}

      <button
        type="submit"
        disabled={loading || code.length < 6 || !displayName}
        className="w-full rounded-[var(--radius-button)] bg-navy px-4 py-3 text-sm font-bold text-paper transition-all hover:brightness-94 disabled:bg-out-soft disabled:text-out-ink disabled:cursor-not-allowed"
      >
        {loading ? 'Joining...' : 'Join Game'}
      </button>
    </form>
  )
}
