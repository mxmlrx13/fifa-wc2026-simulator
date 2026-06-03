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
    <div className="glass-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-[10px] uppercase tracking-wider text-gray-500">
            <th className="px-3 py-2.5">Rank</th>
            <th className="px-3 py-2.5">Group</th>
            <th className="px-3 py-2.5">Team</th>
            <th className="px-3 py-2.5 text-center">P</th>
            <th className="px-3 py-2.5 text-center">W</th>
            <th className="px-3 py-2.5 text-center">D</th>
            <th className="px-3 py-2.5 text-center">L</th>
            <th className="px-3 py-2.5 text-center">GF</th>
            <th className="px-3 py-2.5 text-center">GA</th>
            <th className="px-3 py-2.5 text-center">GD</th>
            <th className="px-3 py-2.5 text-center font-bold text-accent">Pts</th>
            <th className="px-3 py-2.5">Status</th>
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
                  'border-b border-gray-200 transition-colors',
                  r.qualified
                    ? 'border-l-2 border-l-neon-green bg-neon-green/5'
                    : 'text-gray-400 opacity-50'
                )}
              >
                <td className="px-3 py-2 font-medium">{idx + 1}</td>
                <td className="px-3 py-2 font-semibold text-accent">{r.groupId}</td>
                <td className="px-3 py-2 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    {team && <span className="text-sm">{flagEmoji(team.flagCode)}</span>}
                    {team?.name ?? r.teamId}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">{s.played}</td>
                <td className="px-3 py-2 text-center">{s.won}</td>
                <td className="px-3 py-2 text-center">{s.drawn}</td>
                <td className="px-3 py-2 text-center">{s.lost}</td>
                <td className="px-3 py-2 text-center">{s.goalsFor}</td>
                <td className="px-3 py-2 text-center">{s.goalsAgainst}</td>
                <td className="px-3 py-2 text-center">
                  {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
                </td>
                <td className="px-3 py-2 text-center font-bold text-accent">{s.points}</td>
                <td className="px-3 py-2">
                  {r.qualified ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-neon-green">
                      Qualified
                      {r.matchSlot !== null && (
                        <span className="text-[10px] text-neon-green/60">
                          {' '}M{r.matchSlot}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-gray-400">Eliminated</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
