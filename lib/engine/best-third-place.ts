import type { GroupId, GroupStanding, ThirdPlaceResult, Team } from '../types'
import { QUALIFIED_THIRD_PLACE_COUNT } from '../constants'

/**
 * Rank all 12 third-place teams across groups.
 * Top 8 qualify for the knockout round.
 * Pure function.
 */
export function rankThirdPlaceTeams(
  allStandings: Record<GroupId, GroupStanding[]>,
  teamsMap: Record<string, Team> = {}
): ThirdPlaceResult[] {
  const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

  const thirdPlaceTeams: ThirdPlaceResult[] = []

  for (const groupId of groupIds) {
    const standings = allStandings[groupId]
    if (!standings) continue

    const third = standings.find((s) => s.position === 3)
    if (!third) continue

    thirdPlaceTeams.push({
      teamId: third.teamId,
      groupId,
      standing: third,
      qualified: false,
      matchSlot: null,
    })
  }

  // Sort by: points desc -> GD desc -> GF desc -> FIFA ranking asc
  thirdPlaceTeams.sort((a, b) => {
    // Points (descending)
    if (a.standing.points !== b.standing.points) {
      return b.standing.points - a.standing.points
    }
    // Goal difference (descending)
    if (a.standing.goalDifference !== b.standing.goalDifference) {
      return b.standing.goalDifference - a.standing.goalDifference
    }
    // Goals scored (descending)
    if (a.standing.goalsFor !== b.standing.goalsFor) {
      return b.standing.goalsFor - a.standing.goalsFor
    }
    // FIFA ranking (ascending - lower is better)
    const rankA = teamsMap[a.teamId]?.fifaRanking ?? 999
    const rankB = teamsMap[b.teamId]?.fifaRanking ?? 999
    return rankA - rankB
  })

  // Top 8 qualify
  for (let i = 0; i < thirdPlaceTeams.length; i++) {
    thirdPlaceTeams[i].qualified = i < QUALIFIED_THIRD_PLACE_COUNT
  }

  return thirdPlaceTeams
}
