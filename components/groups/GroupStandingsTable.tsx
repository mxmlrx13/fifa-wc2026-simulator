import type { GroupStanding } from '@/lib/types'
import { teamsMap } from '@/lib/data/teams'
import { cn } from '@/lib/utils'

interface GroupStandingsTableProps {
  standings: GroupStanding[]
  condensed?: boolean
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
      return { border: 'border-l-[3px] border-l-win-ink', bg: 'bg-win-soft' }
    case 2:
      return { border: 'border-l-[3px] border-l-runner-ink', bg: 'bg-runner-soft' }
    case 3:
      return { border: 'border-l-[3px] border-l-third-ink', bg: 'bg-third-soft' }
    default:
      return { border: 'border-l-[3px] border-l-transparent', bg: '' }
  }
}

export default function GroupStandingsTable({ standings, condensed }: GroupStandingsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th className="px-1 py-1.5">#</th>
            <th className="px-1 py-1.5">Team</th>
            <th className="px-1 py-1.5 text-center">P</th>
            {!condensed && (
              <>
                <th className="hidden md:table-cell px-1 py-1.5 text-center">W</th>
                <th className="hidden md:table-cell px-1 py-1.5 text-center">D</th>
                <th className="hidden md:table-cell px-1 py-1.5 text-center">L</th>
                <th className="hidden md:table-cell px-1 py-1.5 text-center">GF</th>
                <th className="hidden md:table-cell px-1 py-1.5 text-center">GA</th>
              </>
            )}
            <th className="px-1 py-1.5 text-center">GD</th>
            <th className="px-1 py-1.5 text-center font-bold text-ink">Pts</th>
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
                  'border-b border-line transition-colors',
                  style.border,
                  style.bg,
                  s.position === 4 && 'text-out-ink'
                )}
              >
                <td className="px-1 py-1.5 font-medium tabular-nums">{s.position}</td>
                <td className="px-1 py-1.5 font-semibold">
                  <span className="inline-flex items-center gap-1">
                    {team && <span className="text-sm">{flagEmoji(team.flagCode)}</span>}
                    <span className="truncate">{team?.name ?? s.teamId}</span>
                  </span>
                </td>
                <td className="px-1 py-1.5 text-center tabular-nums">{s.played}</td>
                {!condensed && (
                  <>
                    <td className="hidden md:table-cell px-1 py-1.5 text-center tabular-nums">{s.won}</td>
                    <td className="hidden md:table-cell px-1 py-1.5 text-center tabular-nums">{s.drawn}</td>
                    <td className="hidden md:table-cell px-1 py-1.5 text-center tabular-nums">{s.lost}</td>
                    <td className="hidden md:table-cell px-1 py-1.5 text-center tabular-nums">{s.goalsFor}</td>
                    <td className="hidden md:table-cell px-1 py-1.5 text-center tabular-nums">{s.goalsAgainst}</td>
                  </>
                )}
                <td className="px-1 py-1.5 text-center tabular-nums">
                  {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
                </td>
                <td className="px-1 py-1.5 text-center font-extrabold text-ink tabular-nums">{s.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
