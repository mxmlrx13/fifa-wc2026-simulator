import { teamsMap } from '@/lib/data/teams'
import { cn } from '@/lib/utils'

interface TeamBadgeProps {
  teamId: string
  size?: 'sm' | 'md' | 'lg'
}

function flagEmoji(flagCode: string): string {
  if (flagCode === 'gb-eng') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'
  if (flagCode === 'gb-sct') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'
  if (flagCode === 'gb-wls') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}'
  const code = flagCode.toUpperCase()
  return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + 0x1F1A5))
}

export default function TeamBadge({ teamId, size = 'md' }: TeamBadgeProps) {
  const team = teamsMap[teamId]
  if (!team) return <span className="text-xs text-gray-500">TBD</span>

  const flag = flagEmoji(team.flagCode)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        size === 'sm' && 'text-sm',
        size === 'md' && 'text-base',
        size === 'lg' && 'text-lg'
      )}
    >
      <span
        className={cn(
          'leading-none',
          size === 'sm' && 'text-base',
          size === 'md' && 'text-xl',
          size === 'lg' && 'text-3xl'
        )}
      >
        {flag}
      </span>
      <span className="font-medium">{team.name}</span>
    </span>
  )
}
