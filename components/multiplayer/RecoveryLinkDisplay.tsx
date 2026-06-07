'use client'

import { useState } from 'react'

interface RecoveryLinkDisplayProps {
  code: string
  recoveryToken: string
}

export default function RecoveryLinkDisplay({ code, recoveryToken }: RecoveryLinkDisplayProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const recoveryUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/play/${code}/recover?token=${recoveryToken}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(recoveryUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div className="glass-card p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-700"
      >
        Your Recovery Link
        <svg
          className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-gray-500">
            Save this link to restore access if your browser loses the session.
          </p>
          <div className="flex items-stretch gap-2">
            <input
              readOnly
              value={recoveryUrl}
              className="min-w-0 flex-1 rounded-lg bg-gray-100 px-2 py-1.5 text-[10px] text-gray-600 outline-none"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg bg-accent/20 px-2 py-1.5 text-[10px] font-bold text-accent hover:bg-accent/30"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
