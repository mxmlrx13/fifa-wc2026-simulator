'use client'

import { teams } from '@/lib/data/teams'
import { cn } from '@/lib/utils'

interface ChampionPickerProps {
  selected: string | null
  onPick: (teamId: string) => void
  readOnly?: boolean
}

function flagEmoji(flagCode: string): string {
  if (flagCode === 'gb-eng') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'
  if (flagCode === 'gb-sct') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'
  if (flagCode === 'gb-wls') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}'
  const code = flagCode.toUpperCase()
  return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + 0x1F1A5))
}

// Teams sorted by group then alphabetically within group (France-neutral: no preselection)
const sortedTeams = [...teams].sort((a, b) => {
  // Group order preserved from the data file (already grouped), then alpha by name
  const groupA = teams.indexOf(a)
  const groupB = teams.indexOf(b)
  const gA = Math.floor(groupA / 4)
  const gB = Math.floor(groupB / 4)
  if (gA !== gB) return gA - gB
  return a.name.localeCompare(b.name)
})

export default function ChampionPicker({ selected, onPick, readOnly }: ChampionPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
      {sortedTeams.map((team) => {
        const isSelected = selected === team.id
        return (
          <button
            key={team.id}
            type="button"
            disabled={readOnly}
            onClick={() => onPick(team.id)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-[var(--radius-card)] border px-2 py-3 text-center transition-all',
              isSelected
                ? 'border-red bg-red-soft'
                : 'border-line bg-card hover:bg-paper',
              readOnly && !isSelected && 'opacity-50',
              readOnly && 'cursor-default',
            )}
          >
            <span className="text-xl leading-none">{flagEmoji(team.flagCode)}</span>
            <span className="text-[10px] font-bold text-ink">{team.id}</span>
            <span className="text-[9px] text-muted leading-tight truncate w-full">{team.name}</span>
            {isSelected && (
              <span className="text-[10px] font-bold text-red">{'\u2713'}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
