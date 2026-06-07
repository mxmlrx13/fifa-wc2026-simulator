import { cn } from '@/lib/utils'

type BadgeVariant = 'neutral' | 'open' | 'locked' | 'live'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-badge-bg text-badge-ink',
  open: 'bg-badge-open-bg text-badge-open-ink',
  locked: 'bg-badge-locked-bg text-badge-locked-ink',
  live: 'bg-badge-live-bg text-badge-live-ink',
}

export default function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-pill)] px-[9px] py-[4px] text-[10.5px] font-semibold',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
