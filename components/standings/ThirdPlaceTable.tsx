import type { ThirdPlaceResult } from '@/lib/types'
import { teamsMap } from '@/lib/data/teams'
import { cn } from '@/lib/utils'

interface ThirdPlaceTableProps {
  results: ThirdPlaceResult[]
}

function flagEmoji(flagCode: string): string {
  if (flagCode === 'gb-eng') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'
  if (flagCode === 'gb-sct') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'
  if (flagCode === 'gb-wls') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}'
  const code = flagCode.toUpperCase()
  return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + 0x1F1A5))
}

export default function ThirdPlaceTable({ results }: ThirdPlaceTableProps) {
  if (results.length === 0) return null

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
            <th className="px-3 py-2.5">#</th>
            <th className="px-3 py-2.5">Team</th>
            <th className="px-3 py-2.5">Grp</th>
            <th className="hidden md:table-cell px-3 py-2.5 text-center">P</th>
            <th className="hidden md:table-cell px-3 py-2.5 text-center">W</th>
            <th className="hidden md:table-cell px-3 py-2.5 text-center">D</th>
            <th className="hidden md:table-cell px-3 py-2.5 text-center">L</th>
            <th className="hidden md:table-cell px-3 py-2.5 text-center">GF</th>
            <th className="hidden md:table-cell px-3 py-2.5 text-center">GA</th>
            <th className="px-3 py-2.5 text-center">GD</th>
            <th className="px-3 py-2.5 text-center font-bold text-ink">Pts</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, idx) => {
            const team = teamsMap[r.teamId]
            const s = r.standing
            return (
              <tr
                key={r.teamId}
                className={cn(
                  'border-b border-line transition-colors',
                  r.qualified
                    ? 'border-l-[3px] border-l-win-ink bg-win-soft'
                    : 'text-out-ink opacity-50'
                )}
              >
                <td className="px-3 py-2 font-medium tabular-nums">{idx + 1}</td>
                <td className="px-3 py-2 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    {team && <span className="text-sm">{flagEmoji(team.flagCode)}</span>}
                    <span className="truncate">{team?.name ?? r.teamId}</span>
                  </span>
                </td>
                <td className="px-3 py-2 font-semibold text-navy">{r.groupId}</td>
                <td className="hidden md:table-cell px-3 py-2 text-center tabular-nums">{s.played}</td>
                <td className="hidden md:table-cell px-3 py-2 text-center tabular-nums">{s.won}</td>
                <td className="hidden md:table-cell px-3 py-2 text-center tabular-nums">{s.drawn}</td>
                <td className="hidden md:table-cell px-3 py-2 text-center tabular-nums">{s.lost}</td>
                <td className="hidden md:table-cell px-3 py-2 text-center tabular-nums">{s.goalsFor}</td>
                <td className="hidden md:table-cell px-3 py-2 text-center tabular-nums">{s.goalsAgainst}</td>
                <td className="px-3 py-2 text-center tabular-nums">
                  {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
                </td>
                <td className="px-3 py-2 text-center font-extrabold text-ink tabular-nums">{s.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
