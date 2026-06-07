'use client'

import { useState } from 'react'
import { shareOrCopy, buildInvitePayload } from '@/lib/share'
import { cn } from '@/lib/utils'

interface ShareInviteButtonProps {
  gameName: string
  code: string
  variant?: 'prominent' | 'compact'
}

export default function ShareInviteButton({ gameName, code, variant = 'prominent' }: ShareInviteButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null)

  async function handleShare() {
    const payload = buildInvitePayload(gameName, code)
    const result = await shareOrCopy(payload)
    setFeedback(result === 'shared' ? 'Shared!' : 'Link copied!')
    setTimeout(() => setFeedback(null), 2000)
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleShare}
        className="flex items-center justify-center rounded-[var(--radius-card)] border border-line bg-card px-4 py-3.5 text-sm font-bold text-ink transition-all hover:bg-paper"
      >
        {feedback ?? 'Share Invite'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        'w-full rounded-[var(--radius-button)] border border-navy/20 bg-navy/5 px-4 py-3 text-sm font-bold text-navy transition-all hover:bg-navy/10',
        feedback && 'bg-win-soft text-win-ink border-win-ink/20',
      )}
    >
      {feedback ?? 'Share Invite Link'}
    </button>
  )
}
