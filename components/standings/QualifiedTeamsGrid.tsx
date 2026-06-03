import type { GroupId, GroupStanding, ThirdPlaceResult } from '@/lib/types'
import { teamsMap } from '@/lib/data/teams'
import { cn } from '@/lib/utils'

interface QualifiedTeamsGridProps {
  groupStandings: Record<GroupId, GroupStanding[]>
  thirdPlaceResults: ThirdPlaceResult[]
}

interface QualifiedTeam {
  teamId: string
  groupId: GroupId
  path: 'winner' | 'runner-up' | 'third'
}

function flagEmoji(flagCode: string): string {
  if (flagCode === 'gb-eng') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'
  if (flagCode === 'gb-sct') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'
  if (flagCode === 'gb-wls') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}'
  const code = flagCode.toUpperCase()
  return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + 0x1F1A5))
}

const pathConfig = {
  winner: { label: 'Group Winners', glowClass: 'glow-green', borderClass: 'border-neon-green/30', bgClass: 'bg-neon-green/5' },
  'runner-up': { label: 'Runners-up', glowClass: 'glow-blue', borderClass: 'border-neon-blue/30', bgClass: 'bg-neon-blue/5' },
  third: { label: 'Best Third-Place', glowClass: '', borderClass: 'border-amber-500/30', bgClass: 'bg-amber-500/5' },
} as const

export default function QualifiedTeamsGrid({
  groupStandings,
  thirdPlaceResults,
}: QualifiedTeamsGridProps) {
  const qualified: QualifiedTeam[] = []

  const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

  for (const gid of groupIds) {
    const standings = groupStandings[gid]
    if (!standings) continue
    for (const s of standings) {
      if (s.qualification === 'winner') {
        qualified.push({ teamId: s.teamId, groupId: gid, path: 'winner' })
      } else if (s.qualification === 'runner-up') {
        qualified.push({ teamId: s.teamId, groupId: gid, path: 'runner-up' })
      }
    }
  }

  for (const r of thirdPlaceResults) {
    if (r.qualified) {
      qualified.push({ teamId: r.teamId, groupId: r.groupId, path: 'third' })
    }
  }

  if (qualified.length === 0) return null

  const groups: Record<string, QualifiedTeam[]> = {
    winner: qualified.filter((q) => q.path === 'winner'),
    'runner-up': qualified.filter((q) => q.path === 'runner-up'),
    third: qualified.filter((q) => q.path === 'third'),
  }

  return (
    <div className="space-y-6">
      {(['winner', 'runner-up', 'third'] as const).map((path) => {
        const config = pathConfig[path]
        const teams = groups[path]
        if (teams.length === 0) return null

        return (
          <div key={path}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {config.label} ({teams.length})
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {teams.map((q) => {
                const team = teamsMap[q.teamId]
                return (
                  <div
                    key={q.teamId}
                    className={cn(
                      'glass-card flex items-center gap-2 rounded-lg border px-3 py-2.5',
                      config.borderClass,
                      config.bgClass
                    )}
                  >
                    <span className="text-lg leading-none">
                      {team ? flagEmoji(team.flagCode) : '?'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-foreground">
                        {team?.name ?? q.teamId}
                      </span>
                      <span className="text-[10px] text-gray-500">Gr. {q.groupId}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
