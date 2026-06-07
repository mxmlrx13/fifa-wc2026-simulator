'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface GameCodeDisplayProps {
  code: string
}

export default function GameCodeDisplay({ code }: GameCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-card px-5 py-3 transition-all hover:bg-paper',
        copied && 'border-win-ink/30',
      )}
    >
      <span className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[0.3em] text-ink">
        {code}
      </span>
      <span className="text-[11px] text-muted">
        {copied ? 'Copied!' : 'Click to copy'}
      </span>
    </button>
  )
}
