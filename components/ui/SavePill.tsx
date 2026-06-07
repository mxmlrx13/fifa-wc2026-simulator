'use client'

import { cn } from '@/lib/utils'

type SaveStatus = 'saving' | 'saved' | 'error' | 'hidden'

interface SavePillProps {
  status: SaveStatus
  onRetry?: () => void
  className?: string
}

export default function SavePill({ status, onRetry, className }: SavePillProps) {
  if (status === 'hidden') return null

  return (
    <div
      className={cn(
        'fixed z-40 animate-slideUp',
        'bottom-[74px] left-1/2 -translate-x-1/2 md:bottom-6 md:right-6 md:left-auto md:translate-x-0',
        className,
      )}
    >
      <button
        onClick={status === 'error' ? onRetry : undefined}
        disabled={status !== 'error'}
        className={cn(
          'flex items-center gap-2 rounded-[var(--radius-pill)] bg-navy px-3 py-[7px] text-[11px] font-bold text-paper shadow-float',
          status === 'error' && 'cursor-pointer bg-red',
        )}
      >
        {status === 'saving' && (
          <>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-paper" />
            Saving...
          </>
        )}
        {status === 'saved' && 'Saved \u2713'}
        {status === 'error' && 'Retry'}
      </button>
    </div>
  )
}
