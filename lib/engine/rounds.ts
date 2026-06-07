import { groupFixtures } from '../data/fixtures'
import { GROUP_MATCH_MAX_ID } from '../constants'

export type RoundKey =
  | 'group_md1'
  | 'group_md2'
  | 'group_md3'
  | 'r32'
  | 'r16'
  | 'qf'
  | 'sf'
  | 'final'

const ROUND_ORDER: RoundKey[] = [
  'group_md1',
  'group_md2',
  'group_md3',
  'r32',
  'r16',
  'qf',
  'sf',
  'final',
]

const ROUND_LABELS: Record<RoundKey, string> = {
  group_md1: 'Group Stage — Matchday 1',
  group_md2: 'Group Stage — Matchday 2',
  group_md3: 'Group Stage — Matchday 3',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-finals',
  sf: 'Semi-finals & 3rd Place',
  final: 'Final',
}

// Knockout match ID ranges
const KNOCKOUT_RANGES: Partial<Record<RoundKey, [number, number]>> = {
  r32: [73, 88],
  r16: [89, 96],
  qf: [97, 100],
  sf: [101, 103],
  final: [104, 104],
}

export function getMatchIdsForRound(round: RoundKey): number[] {
  if (round.startsWith('group_md')) {
    const matchday = parseInt(round.slice(-1), 10) as 1 | 2 | 3
    return groupFixtures
      .filter((m) => m.matchday === matchday)
      .map((m) => m.id)
  }

  const range = KNOCKOUT_RANGES[round]
  if (!range) return []

  const ids: number[] = []
  for (let i = range[0]; i <= range[1]; i++) {
    ids.push(i)
  }
  return ids
}

export function getRoundLabel(round: RoundKey): string {
  return ROUND_LABELS[round] ?? round
}

export function getNextRound(round: RoundKey): RoundKey | null {
  const idx = ROUND_ORDER.indexOf(round)
  if (idx === -1 || idx === ROUND_ORDER.length - 1) return null
  return ROUND_ORDER[idx + 1]
}

export function isGroupRound(round: RoundKey): boolean {
  return round.startsWith('group_md')
}

export function getAllRounds(): RoundKey[] {
  return [...ROUND_ORDER]
}

export function getRoundForMatchId(matchId: number): RoundKey | null {
  if (matchId >= 1 && matchId <= GROUP_MATCH_MAX_ID) {
    const match = groupFixtures.find((m) => m.id === matchId)
    if (match) {
      return `group_md${match.matchday}` as RoundKey
    }
    return null
  }
  for (const [round, range] of Object.entries(KNOCKOUT_RANGES)) {
    if (range && matchId >= range[0] && matchId <= range[1]) {
      return round as RoundKey
    }
  }
  return null
}
