import type { GroupMatch, GroupId } from '../types'
import { calculateGroupStandings } from './group-standings'
import { groups } from '../data/groups'
import { teamsMap } from '../data/teams'
import { groupFixtures } from '../data/fixtures'
import { GROUP_MATCH_MAX_ID } from '../constants'

// ── Types ──

export interface ChampionVote {
  teamId: string
  count: number
  total: number
}

export interface GroupWinnerConsensus {
  groupId: GroupId
  teamId: string
  count: number
  total: number
}

export interface BoldestPick {
  playerId: string
  displayName: string
  teamId: string
  type: 'champion' | 'knockout'
  matchId?: number
}

export interface PickSplit {
  matchId: number
  teams: Record<string, number> // teamId → pick count
  total: number
}

// ── Champion votes ──

export function computeChampionVotes(
  players: Array<{ id: string; championPick: string | null }>,
): ChampionVote[] {
  const total = players.filter((p) => p.championPick).length
  if (total === 0) return []

  const counts = new Map<string, number>()
  for (const p of players) {
    if (!p.championPick) continue
    counts.set(p.championPick, (counts.get(p.championPick) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([teamId, count]) => ({ teamId, count, total }))
    .sort((a, b) => b.count - a.count)
}

// ── Group winner consensus ──

/**
 * For each group, compute every player's predicted standings from their
 * group-stage score predictions, then find the team most players have
 * finishing first.
 */
export function computeGroupWinnerConsensus(
  predictions: Array<{
    player_id: string
    match_id: number
    home_score: number | null
    away_score: number | null
  }>,
  playerIds: string[],
): GroupWinnerConsensus[] {
  const groupIds = Object.keys(groups) as GroupId[]
  const result: GroupWinnerConsensus[] = []

  for (const groupId of groupIds) {
    const groupTeamIds = groups[groupId]
    const winnerCounts = new Map<string, number>()
    let total = 0

    for (const playerId of playerIds) {
      // Build that player's predicted matches for this group
      const playerPreds = predictions.filter(
        (p) =>
          p.player_id === playerId &&
          p.match_id <= GROUP_MATCH_MAX_ID &&
          p.home_score !== null &&
          p.away_score !== null,
      )

      // Overlay predictions onto group fixtures
      const matches: GroupMatch[] = groupFixtures
        .filter((f) => f.groupId === groupId)
        .map((f) => {
          const pred = playerPreds.find((p) => p.match_id === f.id)
          if (pred) {
            return { ...f, homeScore: pred.home_score, awayScore: pred.away_score }
          }
          return f
        })

      // Check the player filled all 6 matches for this group
      const filledCount = matches.filter(
        (m) => m.homeScore !== null && m.awayScore !== null,
      ).length
      if (filledCount < 6) continue

      const standings = calculateGroupStandings(matches, groupId, groupTeamIds, teamsMap)
      const winner = standings[0]
      if (winner) {
        total++
        winnerCounts.set(winner.teamId, (winnerCounts.get(winner.teamId) ?? 0) + 1)
      }
    }

    if (total > 0) {
      // Find the team with the most votes
      let bestTeam = ''
      let bestCount = 0
      for (const [teamId, count] of winnerCounts) {
        if (count > bestCount) {
          bestTeam = teamId
          bestCount = count
        }
      }
      result.push({ groupId, teamId: bestTeam, count: bestCount, total })
    }
  }

  return result
}

// ── Boldest picks (unique champion or knockout picks) ──

export function computeBoldestPicks(
  players: Array<{ id: string; displayName: string; championPick: string | null }>,
  knockoutPredictions: Array<{
    player_id: string
    match_id: number
    winner_id: string | null
  }>,
): BoldestPick[] {
  const result: BoldestPick[] = []
  const playerMap = new Map(players.map((p) => [p.id, p]))

  // Champion picks held by exactly one player
  const championCounts = new Map<string, string[]>()
  for (const p of players) {
    if (!p.championPick) continue
    const list = championCounts.get(p.championPick) ?? []
    list.push(p.id)
    championCounts.set(p.championPick, list)
  }
  for (const [teamId, ids] of championCounts) {
    if (ids.length === 1) {
      const player = playerMap.get(ids[0])!
      result.push({
        playerId: ids[0],
        displayName: player.displayName,
        teamId,
        type: 'champion',
      })
    }
  }

  // Knockout winner picks held by exactly one player (per match)
  const matchPickCounts = new Map<number, Map<string, string[]>>()
  for (const pred of knockoutPredictions) {
    if (!pred.winner_id) continue
    if (!matchPickCounts.has(pred.match_id)) {
      matchPickCounts.set(pred.match_id, new Map())
    }
    const teamMap = matchPickCounts.get(pred.match_id)!
    const list = teamMap.get(pred.winner_id) ?? []
    list.push(pred.player_id)
    teamMap.set(pred.winner_id, list)
  }
  for (const [matchId, teamMap] of matchPickCounts) {
    for (const [teamId, ids] of teamMap) {
      if (ids.length === 1) {
        const player = playerMap.get(ids[0])
        if (player) {
          result.push({
            playerId: ids[0],
            displayName: player.displayName,
            teamId,
            type: 'knockout',
            matchId,
          })
        }
      }
    }
  }

  return result
}

// ── Knockout pick splits (per fixture) ──

export function computePickSplits(
  knockoutPredictions: Array<{
    player_id: string
    match_id: number
    winner_id: string | null
  }>,
): PickSplit[] {
  const matchMap = new Map<number, Map<string, number>>()
  const totalMap = new Map<number, number>()

  for (const pred of knockoutPredictions) {
    if (!pred.winner_id) continue
    if (!matchMap.has(pred.match_id)) matchMap.set(pred.match_id, new Map())
    const teams = matchMap.get(pred.match_id)!
    teams.set(pred.winner_id, (teams.get(pred.winner_id) ?? 0) + 1)
    totalMap.set(pred.match_id, (totalMap.get(pred.match_id) ?? 0) + 1)
  }

  return [...matchMap.entries()]
    .map(([matchId, teams]) => ({
      matchId,
      teams: Object.fromEntries(teams),
      total: totalMap.get(matchId) ?? 0,
    }))
    .sort((a, b) => a.matchId - b.matchId)
}
