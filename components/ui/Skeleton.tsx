import { cn } from '@/lib/utils'

interface SkeletonProps {
  variant?: 'text' | 'card' | 'row'
  className?: string
}

export default function Skeleton({ variant = 'text', className }: SkeletonProps) {
  if (variant === 'card') {
    return (
      <div
        className={cn(
          'animate-pulse rounded-[var(--radius-card)] border border-line bg-card p-4',
          className,
        )}
      >
        <div className="mb-3 h-4 w-2/5 rounded bg-paper" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-paper" />
          <div className="h-3 w-3/4 rounded bg-paper" />
        </div>
      </div>
    )
  }

  if (variant === 'row') {
    return (
      <div className={cn('flex animate-pulse items-center gap-3 py-2', className)}>
        <div className="h-5 w-5 rounded-full bg-paper" />
        <div className="h-3 flex-1 rounded bg-paper" />
        <div className="h-3 w-8 rounded bg-paper" />
      </div>
    )
  }

  return (
    <div className={cn('h-3 animate-pulse rounded bg-out-soft', className)} />
  )
}
