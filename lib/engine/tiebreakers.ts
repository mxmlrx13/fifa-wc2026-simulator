import type { GroupMatch, GroupStanding, Team } from '../types'

/**
 * Filter matches where both home and away teams are in the given set of teamIds.
 */
export function getHeadToHeadMatches(
  teamIds: string[],
  matches: GroupMatch[]
): GroupMatch[] {
  const idSet = new Set(teamIds)
  return matches.filter(
    (m) =>
      m.homeScore !== null &&
      m.awayScore !== null &&
      idSet.has(m.homeTeamId) &&
      idSet.has(m.awayTeamId)
  )
}

function computeH2HStats(
  teamId: string,
  matches: GroupMatch[]
): { points: number; gd: number; gf: number } {
  let points = 0
  let gf = 0
  let ga = 0
  for (const m of matches) {
    if (m.homeScore === null || m.awayScore === null) continue
    if (m.homeTeamId === teamId) {
      gf += m.homeScore
      ga += m.awayScore
      if (m.homeScore > m.awayScore) points += 3
      else if (m.homeScore === m.awayScore) points += 1
    } else if (m.awayTeamId === teamId) {
      gf += m.awayScore
      ga += m.homeScore
      if (m.awayScore > m.homeScore) points += 3
      else if (m.awayScore === m.homeScore) points += 1
    }
  }
  return { points, gd: gf - ga, gf }
}

/**
 * Sort standings using the full FIFA tiebreaker cascade.
 * Standings must already have their stats (points, GD, GF, etc.) computed.
 * This function returns a new sorted array.
 */
export function sortByTiebreakers(
  standings: GroupStanding[],
  matches: GroupMatch[],
  teamsMap: Record<string, Team>
): GroupStanding[] {
  if (standings.length <= 1) return [...standings]

  // First, group by points (descending)
  const byPoints = groupByKey(standings, (s) => s.points)
  const sortedPointGroups = [...byPoints.keys()].sort((a, b) => b - a)

  const result: GroupStanding[] = []
  for (const pts of sortedPointGroups) {
    const group = byPoints.get(pts)!
    if (group.length === 1) {
      result.push(group[0])
    } else {
      const resolved = resolveTiedGroup(group, matches, teamsMap)
      result.push(...resolved)
    }
  }

  return result
}

function resolveTiedGroup(
  tied: GroupStanding[],
  matches: GroupMatch[],
  teamsMap: Record<string, Team>
): GroupStanding[] {
  if (tied.length === 1) return tied

  const tiedIds = tied.map((s) => s.teamId)
  const h2hMatches = getHeadToHeadMatches(tiedIds, matches)

  // Step 1: Head-to-head points
  const h2hStats = new Map(
    tiedIds.map((id) => [id, computeH2HStats(id, h2hMatches)])
  )

  // Try h2h points
  let separated = trySeparate(tied, (s) => h2hStats.get(s.teamId)!.points, true)
  if (separated) return flattenSeparated(separated, matches, teamsMap)

  // Step 2: Head-to-head goal difference
  separated = trySeparate(tied, (s) => h2hStats.get(s.teamId)!.gd, true)
  if (separated) return flattenSeparated(separated, matches, teamsMap)

  // Step 3: Head-to-head goals scored
  separated = trySeparate(tied, (s) => h2hStats.get(s.teamId)!.gf, true)
  if (separated) return flattenSeparated(separated, matches, teamsMap)

  // Steps 5-6: Overall goal difference, then overall goals scored
  separated = trySeparate(tied, (s) => s.goalDifference, true)
  if (separated) return flattenSeparated(separated, matches, teamsMap)

  separated = trySeparate(tied, (s) => s.goalsFor, true)
  if (separated) return flattenSeparated(separated, matches, teamsMap)

  // Step 7: Fair play (skip for v1)

  // Step 8: FIFA ranking (lower number = better)
  separated = trySeparate(
    tied,
    (s) => -(teamsMap[s.teamId]?.fifaRanking ?? 999),
    true
  )
  if (separated) return flattenSeparated(separated, matches, teamsMap)

  // Ultimate fallback: just sort by FIFA ranking
  return [...tied].sort(
    (a, b) =>
      (teamsMap[a.teamId]?.fifaRanking ?? 999) -
      (teamsMap[b.teamId]?.fifaRanking ?? 999)
  )
}

/**
 * Try to separate a group of tied teams by a criterion.
 * Returns null if all teams have the same value (no separation).
 * Returns an array of sub-groups (ordered desc by value) if any separation occurs.
 */
function trySeparate(
  tied: GroupStanding[],
  getValue: (s: GroupStanding) => number,
  descending: boolean
): GroupStanding[][] | null {
  const groups = groupByKey(tied, getValue)
  if (groups.size === 1) return null // No separation

  const sortedKeys = [...groups.keys()].sort((a, b) =>
    descending ? b - a : a - b
  )
  return sortedKeys.map((k) => groups.get(k)!)
}

function flattenSeparated(
  groups: GroupStanding[][],
  matches: GroupMatch[],
  teamsMap: Record<string, Team>
): GroupStanding[] {
  const result: GroupStanding[] = []
  for (const group of groups) {
    if (group.length === 1) {
      result.push(group[0])
    } else {
      // Re-apply full cascade to remaining tied sub-group
      result.push(...resolveTiedGroup(group, matches, teamsMap))
    }
  }
  return result
}

function groupByKey<T>(
  items: T[],
  getKey: (item: T) => number
): Map<number, T[]> {
  const map = new Map<number, T[]>()
  for (const item of items) {
    const key = getKey(item)
    const existing = map.get(key)
    if (existing) {
      existing.push(item)
    } else {
      map.set(key, [item])
    }
  }
  return map
}
