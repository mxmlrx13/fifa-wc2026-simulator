import type { KnockoutMatch } from '@/lib/types'
import KnockoutMatchCard from './KnockoutMatch'

interface BracketRoundProps {
  round: string
  matches: KnockoutMatch[]
}

const roundLabels: Record<string, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  '3RD': '3rd Place',
  F: 'Final',
}

export default function BracketRound({ round, matches }: BracketRoundProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <h3 className="sticky top-0 z-10 rounded-[var(--radius-pill)] border border-line bg-card px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-navy shadow-float">
        {roundLabels[round] ?? round}
      </h3>
      <div className="flex flex-col items-center gap-4">
        {matches.map((m) => (
          <KnockoutMatchCard key={m.id} match={m} />
        ))}
      </div>
    </div>
  )
}
