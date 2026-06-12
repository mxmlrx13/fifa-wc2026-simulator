/**
 * Mapping between external data sources and our internal match/team IDs.
 *
 * Group matches (1-72): mapped by team names + date.
 * Knockout matches (73-104): mapped dynamically by resolved team IDs.
 *
 * Team identity resolution uses name normalization, not numeric IDs,
 * so it works across different source APIs without per-source ID tables.
 */

import { groupFixtures } from './fixtures'
import { schedule } from './schedule'

// ─── Team name normalization ─────────────────────────────────────────────────
// Maps common external team name variants → our 3-letter team ID.

const TEAM_NAME_TO_ID: Record<string, string> = {
  // Group A
  'Mexico': 'MEX', 'México': 'MEX',
  'South Africa': 'ZAF',
  'Korea Republic': 'KOR', 'South Korea': 'KOR', 'Korea': 'KOR',
  'Czechia': 'CZE', 'Czech Republic': 'CZE',
  // Group B
  'Canada': 'CAN',
  'Bosnia and Herzegovina': 'BIH', 'Bosnia & Herzegovina': 'BIH', 'Bosnia': 'BIH',
  'Qatar': 'QAT',
  'Switzerland': 'CHE',
  // Group C
  'Brazil': 'BRA', 'Brasil': 'BRA',
  'Morocco': 'MAR', 'Maroc': 'MAR',
  'Haiti': 'HTI',
  'Scotland': 'SCO',
  // Group D
  'United States': 'USA', 'USA': 'USA', 'US': 'USA',
  'Paraguay': 'PRY',
  'Australia': 'AUS',
  'Türkiye': 'TUR', 'Turkey': 'TUR', 'Turkiye': 'TUR',
  // Group E
  'Germany': 'DEU', 'Deutschland': 'DEU',
  'Curaçao': 'CUW', 'Curacao': 'CUW',
  "Côte d'Ivoire": 'CIV', "Cote D'Ivoire": 'CIV', 'Ivory Coast': 'CIV',
  'Ecuador': 'ECU',
  // Group F
  'Netherlands': 'NLD', 'Holland': 'NLD',
  'Japan': 'JPN',
  'Tunisia': 'TUN', 'Tunisie': 'TUN',
  'Sweden': 'SWE',
  // Group G
  'Belgium': 'BEL', 'Belgique': 'BEL',
  'Egypt': 'EGY',
  'Iran': 'IRN', 'IR Iran': 'IRN',
  'New Zealand': 'NZL',
  // Group H
  'Spain': 'ESP', 'España': 'ESP',
  'Cabo Verde': 'CPV', 'Cape Verde': 'CPV',
  'Saudi Arabia': 'SAU',
  'Uruguay': 'URY',
  // Group I
  'France': 'FRA',
  'Senegal': 'SEN', 'Sénégal': 'SEN',
  'Norway': 'NOR',
  'Iraq': 'IRQ',
  // Group J
  'Argentina': 'ARG',
  'Algeria': 'DZA', 'Algérie': 'DZA',
  'Austria': 'AUT',
  'Jordan': 'JOR',
  // Group K
  'Portugal': 'PRT',
  'Congo DR': 'COD', 'DR Congo': 'COD', 'Democratic Republic of Congo': 'COD', 'Congo': 'COD',
  'Uzbekistan': 'UZB',
  'Colombia': 'COL',
  // Group L
  'England': 'ENG',
  'Croatia': 'HRV',
  'Ghana': 'GHA',
  'Panama': 'PAN',
}

// Also accept our own 3-letter codes as input
const ALL_OUR_IDS = new Set(Object.values(TEAM_NAME_TO_ID))
for (const id of ALL_OUR_IDS) {
  TEAM_NAME_TO_ID[id] = id
}

/** Resolve a team name (from any source) to our 3-letter team ID, or null. */
export function resolveTeamId(externalName: string): string | null {
  // Direct lookup
  const direct = TEAM_NAME_TO_ID[externalName]
  if (direct) return direct

  // Case-insensitive lookup
  const lower = externalName.toLowerCase()
  for (const [name, id] of Object.entries(TEAM_NAME_TO_ID)) {
    if (name.toLowerCase() === lower) return id
  }

  return null
}

// ─── Group fixture lookup ────────────────────────────────────────────────────

interface GroupFixtureEntry {
  matchId: number
  homeTeamId: string
  awayTeamId: string
  dateUtc: string // YYYY-MM-DD
  kickoffUtc: string
  groupId: string
}

/** Pre-built index of group fixtures for matching. */
const groupFixtureIndex: GroupFixtureEntry[] = groupFixtures.map((f) => {
  const sched = schedule[f.id]
  return {
    matchId: f.id,
    homeTeamId: f.homeTeamId,
    awayTeamId: f.awayTeamId,
    dateUtc: sched?.kickoffUtc.slice(0, 10) ?? '',
    kickoffUtc: sched?.kickoffUtc ?? '',
    groupId: f.groupId,
  }
})

/**
 * Find our match_id for a group-stage fixture based on team names and date.
 * Returns the match_id or null if no unique match.
 */
export function resolveGroupMatchId(
  homeName: string,
  awayName: string,
  dateStr: string, // YYYY-MM-DD
): number | null {
  const homeId = resolveTeamId(homeName)
  const awayId = resolveTeamId(awayName)
  if (!homeId || !awayId) return null

  // Match by both teams (in either order) + same date
  const matches = groupFixtureIndex.filter((f) => {
    const sameDate = f.dateUtc === dateStr
    const teamsMatch =
      (f.homeTeamId === homeId && f.awayTeamId === awayId) ||
      (f.homeTeamId === awayId && f.awayTeamId === homeId)
    return sameDate && teamsMatch
  })

  if (matches.length === 1) return matches[0].matchId
  return null // ambiguous or not found
}

/**
 * Find our match_id for a knockout fixture based on resolved team IDs.
 * Requires the game's bracket to be resolved (teams known).
 *
 * @param resolvedBracket Map of match_id → { homeTeamId, awayTeamId } for the game
 */
export function resolveKnockoutMatchId(
  homeName: string,
  awayName: string,
  resolvedBracket: Map<number, { homeTeamId: string; awayTeamId: string }>,
): number | null {
  const homeId = resolveTeamId(homeName)
  const awayId = resolveTeamId(awayName)
  if (!homeId || !awayId) return null

  const matches: number[] = []
  for (const [matchId, teams] of resolvedBracket) {
    const teamsMatch =
      (teams.homeTeamId === homeId && teams.awayTeamId === awayId) ||
      (teams.homeTeamId === awayId && teams.awayTeamId === homeId)
    if (teamsMatch) matches.push(matchId)
  }

  if (matches.length === 1) return matches[0]
  return null // ambiguous or not found
}

/**
 * Determine if a matched fixture is home/away swapped relative to our schedule.
 * Returns true if the external source has teams in opposite order from ours.
 */
export function isSwapped(
  externalHomeName: string,
  ourHomeTeamId: string,
): boolean {
  const resolvedHome = resolveTeamId(externalHomeName)
  return resolvedHome !== ourHomeTeamId
}

// ─── Printable mapping table ─────────────────────────────────────────────────

/** Returns the full 72-row group match mapping for verification. */
export function getGroupMatchMappingTable(): GroupFixtureEntry[] {
  return [...groupFixtureIndex]
}
