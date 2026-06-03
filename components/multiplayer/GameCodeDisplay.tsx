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
        'glass-card inline-flex items-center gap-3 px-5 py-3 transition-all hover:bg-gray-100',
        copied && 'glow-green',
      )}
    >
      <span className="font-mono text-2xl font-bold tracking-[0.3em] text-accent">
        {code}
      </span>
      <span className="text-xs text-gray-500">
        {copied ? 'Copied!' : 'Click to copy'}
      </span>
    </button>
  )
}
