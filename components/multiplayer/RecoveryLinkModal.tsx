'use client'

import { useState } from 'react'

interface RecoveryLinkModalProps {
  code: string
  recoveryToken: string
  onClose: () => void
}

export default function RecoveryLinkModal({ code, recoveryToken, onClose }: RecoveryLinkModalProps) {
  const [copied, setCopied] = useState(false)
  const recoveryUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/play/${code}/recover?token=${recoveryToken}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(recoveryUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the text
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 px-4">
      <div className="w-full max-w-md space-y-4 rounded-[var(--radius-card)] border border-line bg-card p-6 shadow-float animate-slideUp">
        <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
          Save your recovery link
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-[17px] font-bold text-ink">Recovery Link</h2>

        <p className="text-[13.5px] text-muted">
          Your session is tied to this browser. If you lose access (clear cookies, switch devices, etc.),
          use this link to restore your player account. <strong className="text-ink">Save it now</strong> — you can also find it
          later on the game dashboard.
        </p>

        <div className="flex items-stretch gap-2">
          <input
            readOnly
            value={recoveryUrl}
            className="min-w-0 flex-1 rounded-[var(--radius-input)] bg-out-soft px-3 py-2 text-xs text-muted outline-none"
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-[var(--radius-button)] border border-line bg-card px-3 py-2 text-xs font-bold text-ink transition-all hover:bg-paper"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-[var(--radius-button)] bg-navy px-4 py-3 text-sm font-bold text-paper transition-all hover:brightness-94"
        >
          I&apos;ve saved it
        </button>
      </div>
    </div>
  )
}
