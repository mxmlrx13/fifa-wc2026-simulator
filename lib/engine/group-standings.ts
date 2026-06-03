import type { GroupMatch, GroupStanding, GroupId, Team } from '../types'
import { sortByTiebreakers } from './tiebreakers'

/**
 * Calculate group standings for a given group from match results.
 * Pure function - no side effects.
 */
export function calculateGroupStandings(
  matches: GroupMatch[],
  groupId: GroupId,
  teams: string[],
  teamsMap: Record<string, Team> = {}
): GroupStanding[] {
  // Filter completed matches for this group
  const groupMatches = matches.filter(
    (m) =>
      m.groupId === groupId &&
      m.homeScore !== null &&
      m.awayScore !== null
  )

  // Initialize standings for each team
  const standingsMap = new Map<string, GroupStanding>()
  for (const teamId of teams) {
    standingsMap.set(teamId, {
      teamId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      position: 0,
      qualification: 'eliminated',
    })
  }

  // Tally results
  for (const match of groupMatches) {
    const home = standingsMap.get(match.homeTeamId)
    const away = standingsMap.get(match.awayTeamId)
    if (!home || !away) continue

    const hs = match.homeScore!
    const as = match.awayScore!

    home.played++
    away.played++
    home.goalsFor += hs
    home.goalsAgainst += as
    away.goalsFor += as
    away.goalsAgainst += hs

    if (hs > as) {
      home.won++
      home.points += 3
      away.lost++
    } else if (hs < as) {
      away.won++
      away.points += 3
      home.lost++
    } else {
      home.drawn++
      away.drawn++
      home.points += 1
      away.points += 1
    }
  }

  // Compute goal difference
  for (const standing of standingsMap.values()) {
    standing.goalDifference = standing.goalsFor - standing.goalsAgainst
  }

  // Sort using tiebreakers
  const allStandings = [...standingsMap.values()]
  const sorted = sortByTiebreakers(allStandings, groupMatches, teamsMap)

  // Assign positions and qualification
  const qualifications: Array<GroupStanding['qualification']> = [
    'winner',
    'runner-up',
    'third',
    'eliminated',
  ]
  for (let i = 0; i < sorted.length; i++) {
    sorted[i].position = i + 1
    sorted[i].qualification = qualifications[i] ?? 'eliminated'
  }

  return sorted
}
