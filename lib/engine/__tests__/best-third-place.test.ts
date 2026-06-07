import { describe, it, expect } from 'vitest'
import { rankThirdPlaceTeams } from '@/lib/engine/best-third-place'
import { thirdPlaceSlots } from '@/lib/data/third-place-clusters'
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

describe('3-way tie resolved by GD', () => {
  it('ranks 3 teams with identical points by goal difference', () => {
    const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
    const allStandings = {} as Record<GroupId, GroupStanding[]>

    for (const g of groupIds) {
      const teamId = `${g}3`
      allStandings[g] = [
        makeStanding(`${g}1`, 1, { points: 9 }),
        makeStanding(`${g}2`, 2, { points: 6 }),
        makeStanding(teamId, 3, { points: 4, goalDifference: 0, goalsFor: 3 }),
        makeStanding(`${g}4`, 4, { points: 0 }),
      ]
    }

    // Give A3, B3, C3 same points (4) but different GD
    allStandings['A'][2].goalDifference = 2
    allStandings['B'][2].goalDifference = 1
    allStandings['C'][2].goalDifference = 0

    const results = rankThirdPlaceTeams(allStandings, teamsMap)

    const topThree = results.slice(0, 3).map((r) => r.teamId)
    expect(topThree[0]).toBe('A3')
    expect(topThree[1]).toBe('B3')
    expect(topThree[2]).toBe('C3')
  })
})

describe('3-way tie resolved by goals scored', () => {
  it('ranks 3 teams with same points and GD by goals scored desc', () => {
    const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
    const allStandings = {} as Record<GroupId, GroupStanding[]>

    for (const g of groupIds) {
      const teamId = `${g}3`
      allStandings[g] = [
        makeStanding(`${g}1`, 1, { points: 9 }),
        makeStanding(`${g}2`, 2, { points: 6 }),
        makeStanding(teamId, 3, { points: 4, goalDifference: 1, goalsFor: 3 }),
        makeStanding(`${g}4`, 4, { points: 0 }),
      ]
    }

    // Give A3, B3, C3 same points (4) and same GD (1) but different GF
    allStandings['A'][2].goalsFor = 5
    allStandings['B'][2].goalsFor = 4
    allStandings['C'][2].goalsFor = 3

    const results = rankThirdPlaceTeams(allStandings, teamsMap)

    const topThree = results.slice(0, 3).map((r) => r.teamId)
    expect(topThree[0]).toBe('A3')
    expect(topThree[1]).toBe('B3')
    expect(topThree[2]).toBe('C3')
  })
})

describe('3-way tie resolved by FIFA ranking', () => {
  it('ranks 3 teams with same points, GD, and GF by FIFA ranking asc', () => {
    const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

    // Custom teamsMap: give all teams a high FIFA ranking, then override A3/B3/C3
    const customTeamsMap: Record<string, Team> = {}
    for (const g of groupIds) {
      customTeamsMap[`${g}3`] = { id: `${g}3`, name: `Team ${g}3`, fifaRanking: 100, confederation: 'UEFA' as const, flagCode: g.toLowerCase() }
    }
    customTeamsMap['A3'] = { id: 'A3', name: 'Team A3', fifaRanking: 10, confederation: 'UEFA' as const, flagCode: 'a' }
    customTeamsMap['B3'] = { id: 'B3', name: 'Team B3', fifaRanking: 20, confederation: 'UEFA' as const, flagCode: 'b' }
    customTeamsMap['C3'] = { id: 'C3', name: 'Team C3', fifaRanking: 30, confederation: 'UEFA' as const, flagCode: 'c' }

    const allStandings = {} as Record<GroupId, GroupStanding[]>

    for (const g of groupIds) {
      const teamId = `${g}3`
      allStandings[g] = [
        makeStanding(`${g}1`, 1, { points: 9 }),
        makeStanding(`${g}2`, 2, { points: 6 }),
        makeStanding(teamId, 3, { points: 4, goalDifference: 1, goalsFor: 3 }),
        makeStanding(`${g}4`, 4, { points: 0 }),
      ]
    }

    const results = rankThirdPlaceTeams(allStandings, customTeamsMap)

    // A3 (rank 10), B3 (rank 20), C3 (rank 30) — lower ranking = better
    const topThree = results.slice(0, 3).map((r) => r.teamId)
    expect(topThree[0]).toBe('A3')
    expect(topThree[1]).toBe('B3')
    expect(topThree[2]).toBe('C3')
  })
})

describe('exactly 8 qualify from 12', () => {
  it('creates 12 third-place teams with varied stats and qualifies exactly 8', () => {
    const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
    const allStandings = {} as Record<GroupId, GroupStanding[]>

    for (let i = 0; i < groupIds.length; i++) {
      const g = groupIds[i]
      const teamId = `${g}3`
      // Varied stats: points from 7 down to 1, then repeat with different GD
      const pts = i < 6 ? 7 - i : 4
      const gd = i < 6 ? 3 : 6 - (i - 6)
      const gf = i < 6 ? 5 : 4 - Math.floor((i - 6) / 2)
      allStandings[g] = [
        makeStanding(`${g}1`, 1, { points: 9 }),
        makeStanding(`${g}2`, 2, { points: 6 }),
        makeStanding(teamId, 3, { points: pts, goalDifference: gd, goalsFor: gf }),
        makeStanding(`${g}4`, 4, { points: 0 }),
      ]
    }

    const results = rankThirdPlaceTeams(allStandings, teamsMap)

    expect(results).toHaveLength(12)

    const qualified = results.filter((r) => r.qualified)
    const eliminated = results.filter((r) => !r.qualified)

    expect(qualified).toHaveLength(8)
    expect(eliminated).toHaveLength(4)
  })
})

describe('deterministic output for identical inputs', () => {
  it('returns the same result when called twice with the same input', () => {
    const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
    const allStandings = {} as Record<GroupId, GroupStanding[]>

    for (let i = 0; i < groupIds.length; i++) {
      const g = groupIds[i]
      const teamId = `${g}3`
      const pts = 12 - i
      allStandings[g] = [
        makeStanding(`${g}1`, 1, { points: 9 }),
        makeStanding(`${g}2`, 2, { points: 6 }),
        makeStanding(teamId, 3, { points: pts, goalDifference: 0, goalsFor: 3 }),
        makeStanding(`${g}4`, 4, { points: 0 }),
      ]
    }

    const results1 = rankThirdPlaceTeams(allStandings, teamsMap)
    const results2 = rankThirdPlaceTeams(allStandings, teamsMap)

    expect(results1).toEqual(results2)
  })
})

describe('slot constraint conformance', () => {
  it('verifies thirdPlaceSlots match the official FIFA 2026 bracket', () => {
    const expectedSlots = [
      { matchId: 74, opponentSlot: '1E', allowedGroups: ['A', 'B', 'C', 'D', 'F'] },
      { matchId: 77, opponentSlot: '1I', allowedGroups: ['C', 'D', 'F', 'G', 'H'] },
      { matchId: 79, opponentSlot: '1A', allowedGroups: ['C', 'E', 'F', 'H', 'I'] },
      { matchId: 80, opponentSlot: '1L', allowedGroups: ['E', 'H', 'I', 'J', 'K'] },
      { matchId: 81, opponentSlot: '1D', allowedGroups: ['B', 'E', 'F', 'I', 'J'] },
      { matchId: 82, opponentSlot: '1G', allowedGroups: ['A', 'E', 'H', 'I', 'J'] },
      { matchId: 85, opponentSlot: '1B', allowedGroups: ['E', 'F', 'G', 'I', 'J'] },
      { matchId: 87, opponentSlot: '1K', allowedGroups: ['D', 'E', 'I', 'J', 'L'] },
    ]

    expect(thirdPlaceSlots).toHaveLength(8)

    for (const expected of expectedSlots) {
      const slot = thirdPlaceSlots.find((s) => s.matchId === expected.matchId)
      expect(slot).toBeDefined()
      expect(slot!.opponentSlot).toBe(expected.opponentSlot)
      expect(slot!.allowedGroups).toEqual(expected.allowedGroups)
    }
  })
})
