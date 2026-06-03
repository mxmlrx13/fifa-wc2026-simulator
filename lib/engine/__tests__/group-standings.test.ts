import { describe, it, expect } from 'vitest'
import { calculateGroupStandings } from '@/lib/engine/group-standings'
import type { GroupMatch, Team } from '@/lib/types'

const teamsMap: Record<string, Team> = {
  T1: { id: 'T1', name: 'Team 1', fifaRanking: 10, confederation: 'UEFA', flagCode: 't1' },
  T2: { id: 'T2', name: 'Team 2', fifaRanking: 20, confederation: 'UEFA', flagCode: 't2' },
  T3: { id: 'T3', name: 'Team 3', fifaRanking: 30, confederation: 'UEFA', flagCode: 't3' },
  T4: { id: 'T4', name: 'Team 4', fifaRanking: 40, confederation: 'UEFA', flagCode: 't4' },
}

function makeGroupMatches(): GroupMatch[] {
  return [
    // Matchday 1: T1 3-0 T2, T3 1-1 T4
    { id: 1, groupId: 'A', matchday: 1, homeTeamId: 'T1', awayTeamId: 'T2', homeScore: 3, awayScore: 0 },
    { id: 2, groupId: 'A', matchday: 1, homeTeamId: 'T3', awayTeamId: 'T4', homeScore: 1, awayScore: 1 },
    // Matchday 2: T1 2-1 T3, T4 0-1 T2
    { id: 3, groupId: 'A', matchday: 2, homeTeamId: 'T1', awayTeamId: 'T3', homeScore: 2, awayScore: 1 },
    { id: 4, groupId: 'A', matchday: 2, homeTeamId: 'T4', awayTeamId: 'T2', homeScore: 0, awayScore: 1 },
    // Matchday 3: T4 0-2 T1, T2 2-0 T3
    { id: 5, groupId: 'A', matchday: 3, homeTeamId: 'T4', awayTeamId: 'T1', homeScore: 0, awayScore: 2 },
    { id: 6, groupId: 'A', matchday: 3, homeTeamId: 'T2', awayTeamId: 'T3', homeScore: 2, awayScore: 0 },
  ]
}

describe('calculateGroupStandings', () => {
  it('computes correct stats for a complete group', () => {
    const matches = makeGroupMatches()
    const standings = calculateGroupStandings(matches, 'A', ['T1', 'T2', 'T3', 'T4'], teamsMap)

    // T1: W3 D0 L0, GF 7 GA 1 GD +6, Pts 9
    const t1 = standings.find((s) => s.teamId === 'T1')!
    expect(t1.played).toBe(3)
    expect(t1.won).toBe(3)
    expect(t1.drawn).toBe(0)
    expect(t1.lost).toBe(0)
    expect(t1.goalsFor).toBe(7)
    expect(t1.goalsAgainst).toBe(1)
    expect(t1.goalDifference).toBe(6)
    expect(t1.points).toBe(9)

    // T2: W2 D0 L1, GF 3 GA 5 GD -2, Pts 6
    const t2 = standings.find((s) => s.teamId === 'T2')!
    expect(t2.points).toBe(6)
    expect(t2.goalsFor).toBe(3)
    expect(t2.goalsAgainst).toBe(3)
  })

  it('assigns correct positions and qualifications', () => {
    const matches = makeGroupMatches()
    const standings = calculateGroupStandings(matches, 'A', ['T1', 'T2', 'T3', 'T4'], teamsMap)

    expect(standings[0].position).toBe(1)
    expect(standings[0].qualification).toBe('winner')
    expect(standings[1].position).toBe(2)
    expect(standings[1].qualification).toBe('runner-up')
    expect(standings[2].position).toBe(3)
    expect(standings[2].qualification).toBe('third')
    expect(standings[3].position).toBe(4)
    expect(standings[3].qualification).toBe('eliminated')
  })

  it('ignores matches from other groups', () => {
    const matches: GroupMatch[] = [
      { id: 1, groupId: 'A', matchday: 1, homeTeamId: 'T1', awayTeamId: 'T2', homeScore: 1, awayScore: 0 },
      { id: 2, groupId: 'B', matchday: 1, homeTeamId: 'T3', awayTeamId: 'T4', homeScore: 3, awayScore: 0 },
    ]
    const standings = calculateGroupStandings(matches, 'A', ['T1', 'T2', 'T3', 'T4'], teamsMap)
    // Only 1 match played (the group A one)
    const t1 = standings.find((s) => s.teamId === 'T1')!
    expect(t1.played).toBe(1)
    expect(t1.points).toBe(3)
    // T3 and T4 should have 0 played (their match was in group B)
    const t3 = standings.find((s) => s.teamId === 'T3')!
    expect(t3.played).toBe(0)
  })

  it('ignores matches with null scores', () => {
    const matches: GroupMatch[] = [
      { id: 1, groupId: 'A', matchday: 1, homeTeamId: 'T1', awayTeamId: 'T2', homeScore: 1, awayScore: 0 },
      { id: 2, groupId: 'A', matchday: 1, homeTeamId: 'T3', awayTeamId: 'T4', homeScore: null, awayScore: null },
    ]
    const standings = calculateGroupStandings(matches, 'A', ['T1', 'T2', 'T3', 'T4'], teamsMap)
    const t3 = standings.find((s) => s.teamId === 'T3')!
    expect(t3.played).toBe(0)
  })
})
