import { GroupMatch, GroupId } from '../types'
import { groups } from './groups'

const groupIds: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

function generateGroupFixtures(): GroupMatch[] {
  const matches: GroupMatch[] = []
  let matchId = 1

  for (const groupId of groupIds) {
    const [t1, t2, t3, t4] = groups[groupId]

    // Matchday 1: Team1 vs Team2, Team3 vs Team4
    matches.push({
      id: matchId++, groupId, matchday: 1,
      homeTeamId: t1, awayTeamId: t2, homeScore: null, awayScore: null,
    })
    matches.push({
      id: matchId++, groupId, matchday: 1,
      homeTeamId: t3, awayTeamId: t4, homeScore: null, awayScore: null,
    })

    // Matchday 2: Team1 vs Team3, Team4 vs Team2
    matches.push({
      id: matchId++, groupId, matchday: 2,
      homeTeamId: t1, awayTeamId: t3, homeScore: null, awayScore: null,
    })
    matches.push({
      id: matchId++, groupId, matchday: 2,
      homeTeamId: t4, awayTeamId: t2, homeScore: null, awayScore: null,
    })

    // Matchday 3: Team4 vs Team1, Team2 vs Team3
    matches.push({
      id: matchId++, groupId, matchday: 3,
      homeTeamId: t4, awayTeamId: t1, homeScore: null, awayScore: null,
    })
    matches.push({
      id: matchId++, groupId, matchday: 3,
      homeTeamId: t2, awayTeamId: t3, homeScore: null, awayScore: null,
    })
  }

  return matches
}

export const groupFixtures: GroupMatch[] = generateGroupFixtures()
