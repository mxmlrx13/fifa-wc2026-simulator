import { describe, it, expect } from 'vitest'
import { sortByTiebreakers, getHeadToHeadMatches } from '@/lib/engine/tiebreakers'
import type { GroupMatch, GroupStanding, Team } from '@/lib/types'

function makeStanding(
  teamId: string,
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
    position: 0,
    qualification: 'eliminated',
    ...overrides,
  }
}

function makeMatch(
  home: string,
  away: string,
  homeScore: number,
  awayScore: number
): GroupMatch {
  return {
    id: 1,
    groupId: 'A',
    matchday: 1,
    homeTeamId: home,
    awayTeamId: away,
    homeScore,
    awayScore,
  }
}

const teamsMap: Record<string, Team> = {
  T1: { id: 'T1', name: 'Team 1', fifaRanking: 10, confederation: 'UEFA', flagCode: 't1' },
  T2: { id: 'T2', name: 'Team 2', fifaRanking: 20, confederation: 'UEFA', flagCode: 't2' },
  T3: { id: 'T3', name: 'Team 3', fifaRanking: 30, confederation: 'UEFA', flagCode: 't3' },
  T4: { id: 'T4', name: 'Team 4', fifaRanking: 40, confederation: 'UEFA', flagCode: 't4' },
}

describe('getHeadToHeadMatches', () => {
  it('filters matches to only include those between specified teams', () => {
    const matches = [
      makeMatch('T1', 'T2', 1, 0),
      makeMatch('T3', 'T4', 2, 1),
      makeMatch('T1', 'T3', 0, 0),
    ]
    const h2h = getHeadToHeadMatches(['T1', 'T2'], matches)
    expect(h2h).toHaveLength(1)
    expect(h2h[0].homeTeamId).toBe('T1')
    expect(h2h[0].awayTeamId).toBe('T2')
  })
})

describe('sortByTiebreakers', () => {
  it('1. separates teams with different points (no tiebreaker needed)', () => {
    const standings = [
      makeStanding('T4', { points: 0 }),
      makeStanding('T2', { points: 6 }),
      makeStanding('T3', { points: 3 }),
      makeStanding('T1', { points: 9 }),
    ]
    const sorted = sortByTiebreakers(standings, [], teamsMap)
    expect(sorted.map((s) => s.teamId)).toEqual(['T1', 'T2', 'T3', 'T4'])
  })

  it('2. two teams tied on points, separated by h2h result', () => {
    const standings = [
      makeStanding('T1', { points: 6, goalDifference: 2, goalsFor: 4 }),
      makeStanding('T2', { points: 6, goalDifference: 2, goalsFor: 4 }),
    ]
    // T2 beat T1 head-to-head
    const matches = [makeMatch('T2', 'T1', 2, 1)]
    const sorted = sortByTiebreakers(standings, matches, teamsMap)
    expect(sorted.map((s) => s.teamId)).toEqual(['T2', 'T1'])
  })

  it('3. two teams tied with h2h draw, falls to overall GD', () => {
    const standings = [
      makeStanding('T1', { points: 4, goalDifference: -1, goalsFor: 3 }),
      makeStanding('T2', { points: 4, goalDifference: 3, goalsFor: 5 }),
    ]
    // H2H was a draw
    const matches = [makeMatch('T1', 'T2', 1, 1)]
    const sorted = sortByTiebreakers(standings, matches, teamsMap)
    expect(sorted.map((s) => s.teamId)).toEqual(['T2', 'T1'])
  })

  it('4. three-way circular tie (A beats B, B beats C, C beats A), recursive resolution', () => {
    // All three have 3 points in h2h (1W, 1L each) and same overall stats
    // H2H: T1 beats T2 (1-0), T2 beats T3 (1-0), T3 beats T1 (1-0)
    // H2H points: all 3 each, H2H GD: all 0 each, H2H GF: all 1 each
    // Falls through to overall GD
    const standings = [
      makeStanding('T1', { points: 6, goalDifference: 2, goalsFor: 5 }),
      makeStanding('T2', { points: 6, goalDifference: 1, goalsFor: 4 }),
      makeStanding('T3', { points: 6, goalDifference: 3, goalsFor: 6 }),
    ]
    const matches = [
      makeMatch('T1', 'T2', 1, 0),
      makeMatch('T2', 'T3', 1, 0),
      makeMatch('T3', 'T1', 1, 0),
    ]
    const sorted = sortByTiebreakers(standings, matches, teamsMap)
    // H2H is perfectly circular (all 3pts, 0 GD, 1 GF), so falls to overall GD
    expect(sorted.map((s) => s.teamId)).toEqual(['T3', 'T1', 'T2'])
  })

  it('5. all 4 teams tied (all draws), falls through to FIFA ranking', () => {
    const standings = [
      makeStanding('T3', { points: 3, goalDifference: 0, goalsFor: 3 }),
      makeStanding('T1', { points: 3, goalDifference: 0, goalsFor: 3 }),
      makeStanding('T4', { points: 3, goalDifference: 0, goalsFor: 3 }),
      makeStanding('T2', { points: 3, goalDifference: 0, goalsFor: 3 }),
    ]
    // All matches are 1-1 draws
    const matches = [
      makeMatch('T1', 'T2', 1, 1),
      makeMatch('T3', 'T4', 1, 1),
      makeMatch('T1', 'T3', 1, 1),
      makeMatch('T4', 'T2', 1, 1),
      makeMatch('T4', 'T1', 1, 1),
      makeMatch('T2', 'T3', 1, 1),
    ]
    const sorted = sortByTiebreakers(standings, matches, teamsMap)
    // Falls through to FIFA ranking: T1(10) < T2(20) < T3(30) < T4(40)
    expect(sorted.map((s) => s.teamId)).toEqual(['T1', 'T2', 'T3', 'T4'])
  })
})
