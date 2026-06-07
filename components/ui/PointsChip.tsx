import { cn } from '@/lib/utils'

type PointsTier = 'exact' | 'gd' | 'result' | 'zero' | 'pending'

interface PointsChipProps {
  tier: PointsTier
  children: React.ReactNode
  className?: string
}

const tierStyles: Record<PointsTier, string> = {
  exact: 'bg-tier-exact-bg text-tier-exact-ink',
  gd: 'bg-tier-gd-bg text-tier-gd-ink',
  result: 'bg-tier-result-bg text-tier-result-ink',
  zero: 'bg-tier-zero-bg text-tier-zero-ink',
  pending: 'bg-tier-zero-bg text-tier-zero-ink',
}

export default function PointsChip({ tier, children, className }: PointsChipProps) {
  return (
    <span
      className={cn(
        'inline-flex min-w-[30px] h-[26px] items-center justify-center rounded-lg px-[7px] text-[12.5px] font-extrabold tabular-nums',
        tierStyles[tier],
        className,
      )}
    >
      {tier === 'pending' ? '\u2013' : children}
    </span>
  )
}
