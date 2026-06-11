'use client'

import { useState } from 'react'
import { linkEmail } from '@/lib/supabase/auth'

export default function LinkEmailForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    const { error: err } = await linkEmail(email.trim())

    setLoading(false)

    if (err) {
      if (err.message?.includes('already been registered')) {
        setError('This email is already in use.')
      } else {
        setError(err.message ?? 'Something went wrong.')
      }
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-card p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
          Email Linked
        </h3>
        <p className="mt-2 text-[11px] text-muted">
          Check your inbox for a confirmation email. Check spam if you don&apos;t see it.
        </p>
        <button
          type="button"
          onClick={() => { setSent(false); setEmail('') }}
          className="mt-2 text-[11px] font-semibold text-navy hover:underline"
        >
          Resend
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-4">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
        Link Your Email
      </h3>
      <p className="mt-1.5 text-[11px] text-muted">
        Access your games from any device.
      </p>
      <form onSubmit={handleSubmit} className="mt-3 flex items-stretch gap-2">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 rounded-[var(--radius-input)] border border-line bg-out-soft px-3 py-2 text-[12px] text-ink outline-none placeholder:text-muted focus:border-navy"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-[var(--radius-button)] bg-navy px-4 py-2 text-[12px] font-bold text-paper transition-all hover:brightness-94 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Link'}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-[11px] text-red">{error}</p>
      )}
    </div>
  )
}
