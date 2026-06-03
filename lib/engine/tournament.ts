import type { GroupId, GroupStanding, KnockoutMatch, ThirdPlaceResult, TournamentState } from '../types'
import { groups } from '../data/groups'
import { bracketTemplate } from '../data/bracket-template'
import { teamsMap } from '../data/teams'
import { calculateGroupStandings } from './group-standings'
import { rankThirdPlaceTeams } from './best-third-place'
import { assignThirdPlaceToSlots, populateBracket } from './knockout-bracket'

const GROUP_IDS: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

/**
 * Orchestrator: compute the full tournament state from match results and picks.
 * Pure function - no side effects.
 */
export function computeTournament(state: TournamentState): {
  groupStandings: Record<GroupId, GroupStanding[]>
  thirdPlaceResults: ThirdPlaceResult[]
  knockoutMatches: KnockoutMatch[]
  allGroupsComplete: boolean
  champion: string | null
} {
  // 1. Compute standings for each group
  const groupStandings = {} as Record<GroupId, GroupStanding[]>
  let allGroupsComplete = true

  for (const groupId of GROUP_IDS) {
    const teamIds = groups[groupId]
    groupStandings[groupId] = calculateGroupStandings(
      state.groupMatches,
      groupId,
      teamIds,
      teamsMap
    )

    // A group is complete when all 4 teams have played 3 matches
    const maxPlayed = Math.max(
      ...groupStandings[groupId].map((s) => s.played)
    )
    if (maxPlayed < 3) {
      allGroupsComplete = false
    }
  }

  // 2. Compute best third-place teams (only meaningful when all groups are done)
  let thirdPlaceResults: ThirdPlaceResult[] = []
  if (allGroupsComplete) {
    thirdPlaceResults = rankThirdPlaceTeams(groupStandings, teamsMap)
    thirdPlaceResults = assignThirdPlaceToSlots(thirdPlaceResults)
  }

  // 3. Populate knockout bracket
  const knockoutMatches = populateBracket(
    groupStandings,
    thirdPlaceResults,
    state.knockoutPicks,
    bracketTemplate
  )

  // 4. Determine champion
  const finalMatch = knockoutMatches.find((m) => m.round === 'F')
  const champion = finalMatch?.winnerId ?? null

  return {
    groupStandings,
    thirdPlaceResults,
    knockoutMatches,
    allGroupsComplete,
    champion,
  }
}
