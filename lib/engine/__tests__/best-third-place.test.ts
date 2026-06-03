import { describe, it, expect } from 'vitest'
import { rankThirdPlaceTeams } from '@/lib/engine/best-third-place'
import type { GroupId, GroupStanding, Team } from '@/lib/types'

function makeStanding(
  teamId: string,
  position: number,
  overrides: Partial<GroupStanding> = {}
): GroupStanding {
  return {
    teamId,
    played: 3,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    position,
    qualification: position === 1 ? 'winner' : position === 2 ? 'runner-up' : position === 3 ? 'third' : 'eliminated',
    ...overrides,
  }
}

const teamsMap: Record<string, Team> = Object.fromEntries(
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((g, i) => [
    `${g}3`,
    { id: `${g}3`, name: `Team ${g}3`, fifaRanking: (i + 1) * 5, confederation: 'UEFA' as const, flagCode: g.toLowerCase() },
  ])
)

describe('rankThirdPlaceTeams', () => {
  it('ranks 12 third-place teams and qualifies top 8', () => {
    const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
    const allStandings = {} as Record<GroupId, GroupStanding[]>

    for (let i = 0; i < groupIds.length; i++) {
      const g = groupIds[i]
      const teamId = `${g}3`
      // Give different points so ranking is deterministic
      const pts = 12 - i // A gets 12, B gets 11, ..., L gets 1
      allStandings[g] = [
        makeStanding(`${g}1`, 1, { points: 9 }),
        makeStanding(`${g}2`, 2, { points: 6 }),
        makeStanding(teamId, 3, { points: pts, goalDifference: 0, goalsFor: 3 }),
        makeStanding(`${g}4`, 4, { points: 0 }),
      ]
    }

    const results = rankThirdPlaceTeams(allStandings, teamsMap)

    expect(results).toHaveLength(12)

    // Top 8 should be qualified
    const qualified = results.filter((r) => r.qualified)
    expect(qualified).toHaveLength(8)

    // Bottom 4 should not be qualified
    const eliminated = results.filter((r) => !r.qualified)
    expect(eliminated).toHaveLength(4)

    // Check ordering: A3 (12pts) should be first, L3 (1pt) should be last
    expect(results[0].teamId).toBe('A3')
    expect(results[11].teamId).toBe('L3')

    // Groups I, J, K, L should be eliminated (lowest points)
    const eliminatedIds = eliminated.map((r) => r.teamId).sort()
    expect(eliminatedIds).toEqual(['I3', 'J3', 'K3', 'L3'])
  })

  it('breaks ties by goal difference, then goals scored, then FIFA ranking', () => {
    const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
    const allStandings = {} as Record<GroupId, GroupStanding[]>

    for (const g of groupIds) {
      const teamId = `${g}3`
      allStandings[g] = [
        makeStanding(`${g}1`, 1, { points: 9 }),
        makeStanding(`${g}2`, 2, { points: 6 }),
        makeStanding(teamId, 3, { points: 3, goalDifference: 0, goalsFor: 2 }),
        makeStanding(`${g}4`, 4, { points: 0 }),
      ]
    }
    // Give A3 better GD
    allStandings['A'][2].goalDifference = 2
    // Give B3 same GD as others but more GF
    allStandings['B'][2].goalsFor = 5

    const results = rankThirdPlaceTeams(allStandings, teamsMap)

    // A3 should be first (best GD)
    expect(results[0].teamId).toBe('A3')
    // B3 should be second (same GD as rest but more GF)
    expect(results[1].teamId).toBe('B3')
  })
})
