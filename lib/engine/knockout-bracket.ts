import type { GroupId, GroupStanding, KnockoutMatch, ThirdPlaceResult } from '../types'
import type { BracketMatch } from '../data/bracket-template'
import { thirdPlaceSlots } from '../data/third-place-clusters'

/**
 * Assign 8 qualified third-place teams to R32 match slots using
 * backtracking constraint satisfaction.
 * Each slot has a set of allowed groups; each team must go to exactly one slot.
 * Returns a new array with matchSlot populated.
 */
export function assignThirdPlaceToSlots(
  qualifiedThirds: ThirdPlaceResult[]
): ThirdPlaceResult[] {
  const qualified = qualifiedThirds
    .filter((t) => t.qualified)
    .map((t) => ({ ...t }))

  const slots = thirdPlaceSlots.map((s) => ({ ...s }))
  const assignment = new Map<number, ThirdPlaceResult>() // matchId -> team

  function backtrack(slotIndex: number): boolean {
    if (slotIndex === slots.length) {
      return assignment.size === slots.length
    }

    const slot = slots[slotIndex]
    for (const team of qualified) {
      // Check if team is already assigned
      if ([...assignment.values()].some((t) => t.teamId === team.teamId)) {
        continue
      }
      // Check if team's group is allowed for this slot
      if (!slot.allowedGroups.includes(team.groupId)) {
        continue
      }
      // Assign
      assignment.set(slot.matchId, team)
      if (backtrack(slotIndex + 1)) {
        return true
      }
      assignment.delete(slot.matchId)
    }
    return false
  }

  backtrack(0)

  // Set matchSlot on the results
  const result = qualifiedThirds.map((t) => ({ ...t }))
  for (const [matchId, assignedTeam] of assignment) {
    const r = result.find((t) => t.teamId === assignedTeam.teamId)
    if (r) {
      r.matchSlot = matchId
    }
  }

  return result
}

/**
 * Resolve a slot string to a team ID.
 * Slot formats:
 *   "1A" -> winner of group A
 *   "2B" -> runner-up of group B
 *   "3{A,B,C,D,F}" -> third-place team assigned to this match
 *   "W73" -> winner of match 73
 *   "L101" -> loser of match 101
 */
function resolveSlot(
  slot: string,
  groupStandings: Record<GroupId, GroupStanding[]>,
  thirdPlaceResults: ThirdPlaceResult[],
  knockoutPicks: Record<number, string>,
  knockoutMatchesMap: Map<number, KnockoutMatch>,
  matchId: number
): string | null {
  // Winner/Loser of a knockout match
  if (slot.startsWith('W') || slot.startsWith('L')) {
    const prefix = slot[0]
    const refMatchId = parseInt(slot.slice(1), 10)
    const winnerId = knockoutPicks[refMatchId] ?? null
    if (!winnerId) return null

    if (prefix === 'W') {
      return winnerId
    } else {
      // Loser: find the other team in that match
      const refMatch = knockoutMatchesMap.get(refMatchId)
      if (!refMatch) return null
      if (refMatch.homeTeamId === winnerId) return refMatch.awayTeamId
      if (refMatch.awayTeamId === winnerId) return refMatch.homeTeamId
      return null
    }
  }

  // Third-place slot: "3{A,B,C,D,F}"
  if (slot.startsWith('3{')) {
    const assigned = thirdPlaceResults.find((t) => t.matchSlot === matchId)
    return assigned?.teamId ?? null
  }

  // Group position: "1A", "2B", etc.
  const posChar = slot[0]
  const groupId = slot.slice(1) as GroupId
  const pos = parseInt(posChar, 10)

  const standings = groupStandings[groupId]
  if (!standings) return null

  const team = standings.find((s) => s.position === pos)
  return team?.teamId ?? null
}

/**
 * Populate the knockout bracket from group standings, third-place assignments,
 * and user picks. Pure function.
 */
export function populateBracket(
  groupStandings: Record<GroupId, GroupStanding[]>,
  thirdPlaceResults: ThirdPlaceResult[],
  knockoutPicks: Record<number, string>,
  bracketTemplate: BracketMatch[]
): KnockoutMatch[] {
  // Deep copy the template
  const matches: KnockoutMatch[] = bracketTemplate.map((m) => ({ ...m }))
  const matchesMap = new Map<number, KnockoutMatch>()
  for (const m of matches) {
    matchesMap.set(m.id, m)
  }

  // Process matches in order (R32 first, then R16, etc.)
  for (const match of matches) {
    match.homeTeamId = resolveSlot(
      match.homeSlot,
      groupStandings,
      thirdPlaceResults,
      knockoutPicks,
      matchesMap,
      match.id
    )
    match.awayTeamId = resolveSlot(
      match.awaySlot,
      groupStandings,
      thirdPlaceResults,
      knockoutPicks,
      matchesMap,
      match.id
    )
    match.winnerId = knockoutPicks[match.id] ?? null
  }

  return matches
}
