import { describe, it, expect } from 'vitest'
import { assignThirdPlaceToSlots, populateBracket } from '@/lib/engine/knockout-bracket'
import type { GroupId, GroupStanding, ThirdPlaceResult } from '@/lib/types'
import type { BracketMatch } from '@/lib/data/bracket-template'

function makeStanding(
  teamId: string,
  position: number
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
  }
}

function makeThirdPlaceResult(teamId: string, groupId: GroupId): ThirdPlaceResult {
  return {
    teamId,
    groupId,
    standing: makeStanding(teamId, 3),
    qualified: true,
    matchSlot: null,
  }
}

describe('assignThirdPlaceToSlots', () => {
  it('assigns all 8 qualified third-place teams to valid slots', () => {
    // Pick 8 groups whose third-place teams should be assignable
    const qualifiedGroups: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'I', 'J']
    const eliminatedGroups: GroupId[] = ['G', 'H', 'K', 'L']

    const thirdPlaceResults: ThirdPlaceResult[] = [
      ...qualifiedGroups.map((g) => makeThirdPlaceResult(`${g}3`, g)),
      ...eliminatedGroups.map((g) => ({
        ...makeThirdPlaceResult(`${g}3`, g),
        qualified: false,
      })),
    ]

    const result = assignThirdPlaceToSlots(thirdPlaceResults)

    // All qualified teams should have a matchSlot
    const assigned = result.filter((r) => r.qualified && r.matchSlot !== null)
    expect(assigned).toHaveLength(8)

    // Each match slot should be unique
    const slots = assigned.map((r) => r.matchSlot)
    expect(new Set(slots).size).toBe(8)

    // Non-qualified teams should not have a slot
    const unassigned = result.filter((r) => !r.qualified)
    for (const t of unassigned) {
      expect(t.matchSlot).toBeNull()
    }
  })

  it('handles a different combination of qualified groups', () => {
    const qualifiedGroups: GroupId[] = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    const eliminatedGroups: GroupId[] = ['A', 'B', 'K', 'L']

    const thirdPlaceResults: ThirdPlaceResult[] = [
      ...qualifiedGroups.map((g) => makeThirdPlaceResult(`${g}3`, g)),
      ...eliminatedGroups.map((g) => ({
        ...makeThirdPlaceResult(`${g}3`, g),
        qualified: false,
      })),
    ]

    const result = assignThirdPlaceToSlots(thirdPlaceResults)
    const assigned = result.filter((r) => r.qualified && r.matchSlot !== null)
    expect(assigned).toHaveLength(8)
  })
})

describe('populateBracket', () => {
  it('populates R32 matches with group winners and runners-up', () => {
    const groupStandings = {} as Record<GroupId, GroupStanding[]>
    const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

    for (const g of groupIds) {
      groupStandings[g] = [
        makeStanding(`${g}1`, 1),
        makeStanding(`${g}2`, 2),
        makeStanding(`${g}3`, 3),
        makeStanding(`${g}4`, 4),
      ]
    }

    // Simple bracket template with one R32 match
    const template: BracketMatch[] = [
      { id: 73, round: 'R32', homeSlot: '2A', awaySlot: '2B', homeTeamId: null, awayTeamId: null, winnerId: null },
    ]

    const result = populateBracket(groupStandings, [], {}, template)
    expect(result[0].homeTeamId).toBe('A2')
    expect(result[0].awayTeamId).toBe('B2')
  })

  it('populates later rounds from knockoutPicks', () => {
    const groupStandings = {} as Record<GroupId, GroupStanding[]>
    const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
    for (const g of groupIds) {
      groupStandings[g] = [
        makeStanding(`${g}1`, 1),
        makeStanding(`${g}2`, 2),
        makeStanding(`${g}3`, 3),
        makeStanding(`${g}4`, 4),
      ]
    }

    const template: BracketMatch[] = [
      { id: 73, round: 'R32', homeSlot: '2A', awaySlot: '2B', homeTeamId: null, awayTeamId: null, winnerId: null },
      { id: 75, round: 'R32', homeSlot: '1F', awaySlot: '2C', homeTeamId: null, awayTeamId: null, winnerId: null },
      { id: 90, round: 'R16', homeSlot: 'W73', awaySlot: 'W75', homeTeamId: null, awayTeamId: null, winnerId: null },
    ]

    const picks: Record<number, string> = {
      73: 'A2',   // A2 wins match 73
      75: 'F1',   // F1 wins match 75
    }

    const result = populateBracket(groupStandings, [], picks, template)

    // R32 matches should be populated
    expect(result[0].homeTeamId).toBe('A2')
    expect(result[0].awayTeamId).toBe('B2')
    expect(result[0].winnerId).toBe('A2')

    // R16 match should resolve winners
    const r16 = result.find((m) => m.id === 90)!
    expect(r16.homeTeamId).toBe('A2')
    expect(r16.awayTeamId).toBe('F1')
  })

  it('resolves loser slots (L101 for 3rd place match)', () => {
    const groupStandings = {} as Record<GroupId, GroupStanding[]>
    const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
    for (const g of groupIds) {
      groupStandings[g] = [
        makeStanding(`${g}1`, 1),
        makeStanding(`${g}2`, 2),
        makeStanding(`${g}3`, 3),
        makeStanding(`${g}4`, 4),
      ]
    }

    const template: BracketMatch[] = [
      { id: 101, round: 'SF', homeSlot: '1A', awaySlot: '1B', homeTeamId: null, awayTeamId: null, winnerId: null },
      { id: 103, round: '3RD', homeSlot: 'L101', awaySlot: '1C', homeTeamId: null, awayTeamId: null, winnerId: null },
    ]

    const picks: Record<number, string> = {
      101: 'A1', // A1 wins, so B1 is the loser
    }

    const result = populateBracket(groupStandings, [], picks, template)
    const thirdPlace = result.find((m) => m.id === 103)!
    expect(thirdPlace.homeTeamId).toBe('B1') // Loser of 101
    expect(thirdPlace.awayTeamId).toBe('C1')
  })
})
