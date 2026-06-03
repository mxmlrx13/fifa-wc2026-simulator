import type { GroupStanding } from '@/lib/types'
import { teamsMap } from '@/lib/data/teams'
import { cn } from '@/lib/utils'

interface GroupStandingsTableProps {
  standings: GroupStanding[]
}

function flagEmoji(flagCode: string): string {
  if (flagCode === 'gb-eng') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'
  if (flagCode === 'gb-sct') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'
  if (flagCode === 'gb-wls') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}'
  const code = flagCode.toUpperCase()
  return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + 0x1F1A5))
}

function rowStyle(position: number): { border: string; bg: string } {
  switch (position) {
    case 1:
      return { border: 'border-l-2 border-l-neon-green', bg: 'bg-neon-green/5' }
    case 2:
      return { border: 'border-l-2 border-l-neon-blue', bg: 'bg-neon-blue/5' }
    case 3:
      return { border: 'border-l-2 border-l-amber-500', bg: 'bg-amber-500/5' }
    default:
      return { border: 'border-l-2 border-l-transparent', bg: '' }
  }
}

export default function GroupStandingsTable({ standings }: GroupStandingsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="px-1 py-1.5">#</th>
            <th className="px-1 py-1.5">Team</th>
            <th className="px-1 py-1.5 text-center">P</th>
            <th className="px-1 py-1.5 text-center">W</th>
            <th className="px-1 py-1.5 text-center">D</th>
            <th className="px-1 py-1.5 text-center">L</th>
            <th className="px-1 py-1.5 text-center">GF</th>
            <th className="px-1 py-1.5 text-center">GA</th>
            <th className="px-1 py-1.5 text-center">GD</th>
            <th className="px-1 py-1.5 text-center font-bold text-accent">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => {
            const team = teamsMap[s.teamId]
            const style = rowStyle(s.position)
            return (
              <tr
                key={s.teamId}
                className={cn(
                  'border-b border-gray-200 transition-colors',
                  style.border,
                  style.bg,
                  s.position === 4 && 'text-gray-400'
                )}
              >
                <td className="px-1 py-1.5 font-medium">{s.position}</td>
                <td className="px-1 py-1.5 font-medium">
                  <span className="inline-flex items-center gap-1">
                    {team && <span className="text-sm">{flagEmoji(team.flagCode)}</span>}
                    <span className="truncate">{team?.name ?? s.teamId}</span>
                  </span>
                </td>
                <td className="px-1 py-1.5 text-center">{s.played}</td>
                <td className="px-1 py-1.5 text-center">{s.won}</td>
                <td className="px-1 py-1.5 text-center">{s.drawn}</td>
                <td className="px-1 py-1.5 text-center">{s.lost}</td>
                <td className="px-1 py-1.5 text-center">{s.goalsFor}</td>
                <td className="px-1 py-1.5 text-center">{s.goalsAgainst}</td>
                <td className="px-1 py-1.5 text-center">
                  {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
                </td>
                <td className="px-1 py-1.5 text-center font-bold text-accent">{s.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
