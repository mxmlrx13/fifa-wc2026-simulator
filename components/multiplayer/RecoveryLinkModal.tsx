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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="glass-card w-full max-w-md space-y-4 p-6">
        <h2 className="text-lg font-bold text-accent">Save Your Recovery Link</h2>

        <p className="text-sm text-gray-600">
          Your session is tied to this browser. If you lose access (clear cookies, switch devices, etc.),
          use this link to restore your player account. <strong>Save it now</strong> — you can also find it
          later on the game dashboard.
        </p>

        <div className="flex items-stretch gap-2">
          <input
            readOnly
            value={recoveryUrl}
            className="min-w-0 flex-1 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700 outline-none"
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg bg-accent/20 px-3 py-2 text-xs font-bold text-accent transition-all hover:bg-accent/30"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200"
        >
          I&apos;ve saved it
        </button>
      </div>
    </div>
  )
}
