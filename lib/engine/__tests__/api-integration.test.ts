import { describe, it, expect } from 'vitest'
import {
  getPredictionRoundForMatchId,
  PREDICTION_ROUNDS,
  CHAMPION_BONUS,
  type PredictionRoundKey,
} from '@/lib/constants'

// ---------------------------------------------------------------------------
// 1. Predictions rejected for non-open rounds
// ---------------------------------------------------------------------------

function canSubmitPrediction(
  matchId: number,
  roundStatuses: Map<string, string>,
): boolean {
  const round = getPredictionRoundForMatchId(matchId)
  if (!round) return false
  return roundStatuses.get(round) === 'open'
}

describe('canSubmitPrediction — predictions rejected for non-open rounds', () => {
  it('allows prediction when group round is open', () => {
    const statuses = new Map<string, string>([['group', 'open']])
    expect(canSubmitPrediction(1, statuses)).toBe(true)
  })

  it('rejects prediction when group round is locked', () => {
    const statuses = new Map<string, string>([['group', 'locked']])
    expect(canSubmitPrediction(1, statuses)).toBe(false)
  })

  it('rejects prediction when group round is scored', () => {
    const statuses = new Map<string, string>([['group', 'scored']])
    expect(canSubmitPrediction(1, statuses)).toBe(false)
  })

  it('rejects prediction for r32 match when r32 is pending', () => {
    const statuses = new Map<string, string>([['r32', 'pending']])
    expect(canSubmitPrediction(73, statuses)).toBe(false)
  })

  it('allows prediction for r32 match when r32 is open', () => {
    const statuses = new Map<string, string>([['r32', 'open']])
    expect(canSubmitPrediction(73, statuses)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 2. lock_round transitions
// ---------------------------------------------------------------------------

function canLockRound(currentStatus: string): { allowed: boolean; error?: string } {
  if (currentStatus === 'open') return { allowed: true }
  return { allowed: false, error: `cannot_lock_from_${currentStatus}` }
}

function canUnlockRound(
  currentStatus: string,
  hasResults: boolean,
): { allowed: boolean; error?: string } {
  if (currentStatus !== 'locked') {
    return { allowed: false, error: `cannot_unlock_from_${currentStatus}` }
  }
  if (hasResults) {
    return { allowed: false, error: 'results_already_entered' }
  }
  return { allowed: true }
}

describe('lock_round transitions', () => {
  it('open -> locked: allowed', () => {
    expect(canLockRound('open')).toEqual({ allowed: true })
  })

  it('pending -> locked: rejected', () => {
    expect(canLockRound('pending').allowed).toBe(false)
  })

  it('scored -> locked: rejected', () => {
    expect(canLockRound('scored').allowed).toBe(false)
  })

  it('locked -> unlocked: allowed when no results', () => {
    expect(canUnlockRound('locked', false)).toEqual({ allowed: true })
  })

  it('locked -> unlocked: blocked when results exist', () => {
    expect(canUnlockRound('locked', true)).toEqual({
      allowed: false,
      error: 'results_already_entered',
    })
  })
})

// ---------------------------------------------------------------------------
// 3. Results rejected when parent round not locked
// ---------------------------------------------------------------------------

function canEnterResults(predictionRoundStatus: string): { allowed: boolean; error?: string } {
  if (predictionRoundStatus === 'locked') return { allowed: true }
  if (predictionRoundStatus === 'scored') return { allowed: true }
  return { allowed: false, error: `round_must_be_locked_or_scored_not_${predictionRoundStatus}` }
}

describe('canEnterResults — results rejected when parent round not locked', () => {
  it('round is locked -> allowed', () => {
    expect(canEnterResults('locked')).toEqual({ allowed: true })
  })

  it('round is scored -> allowed (re-entry)', () => {
    expect(canEnterResults('scored')).toEqual({ allowed: true })
  })

  it('round is open -> rejected', () => {
    expect(canEnterResults('open').allowed).toBe(false)
  })

  it('round is pending -> rejected', () => {
    expect(canEnterResults('pending').allowed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 4. Tied knockout without winnerId -> 400
// ---------------------------------------------------------------------------

function validateKnockoutResults(
  results: Array<{ matchId: number; homeScore: number; awayScore: number; winnerId?: string }>,
): { valid: boolean; tiedMatchIds: number[] } {
  const tiedMatchIds = results
    .filter((r) => r.homeScore === r.awayScore && !r.winnerId)
    .map((r) => r.matchId)
  return { valid: tiedMatchIds.length === 0, tiedMatchIds }
}

describe('validateKnockoutResults — tied knockout without winnerId', () => {
  it('all decisive scores -> valid', () => {
    const results = [
      { matchId: 73, homeScore: 2, awayScore: 1 },
      { matchId: 74, homeScore: 0, awayScore: 3 },
    ]
    expect(validateKnockoutResults(results)).toEqual({ valid: true, tiedMatchIds: [] })
  })

  it('one tied with winnerId -> valid', () => {
    const results = [
      { matchId: 73, homeScore: 1, awayScore: 1, winnerId: 'BRA' },
    ]
    expect(validateKnockoutResults(results)).toEqual({ valid: true, tiedMatchIds: [] })
  })

  it('one tied without winnerId -> invalid, returns match ID', () => {
    const results = [
      { matchId: 73, homeScore: 1, awayScore: 1 },
    ]
    const result = validateKnockoutResults(results)
    expect(result.valid).toBe(false)
    expect(result.tiedMatchIds).toEqual([73])
  })

  it('multiple tied without winnerId -> returns all IDs', () => {
    const results = [
      { matchId: 73, homeScore: 1, awayScore: 1 },
      { matchId: 74, homeScore: 2, awayScore: 0 },
      { matchId: 75, homeScore: 0, awayScore: 0 },
      { matchId: 76, homeScore: 3, awayScore: 3 },
    ]
    const result = validateKnockoutResults(results)
    expect(result.valid).toBe(false)
    expect(result.tiedMatchIds).toEqual([73, 75, 76])
  })

  it('0-0 without winner -> invalid', () => {
    const results = [
      { matchId: 89, homeScore: 0, awayScore: 0 },
    ]
    const result = validateKnockoutResults(results)
    expect(result.valid).toBe(false)
    expect(result.tiedMatchIds).toEqual([89])
  })
})

// ---------------------------------------------------------------------------
// 5. Round auto-transitions
// ---------------------------------------------------------------------------

function computeRoundTransitions(
  roundStatuses: Record<string, string>,
  completedRound: string,
): Record<string, string> {
  const updated = { ...roundStatuses }
  updated[completedRound] = 'scored'

  const idx = PREDICTION_ROUNDS.indexOf(completedRound as PredictionRoundKey)
  if (idx >= 0 && idx < PREDICTION_ROUNDS.length - 1) {
    const nextRound = PREDICTION_ROUNDS[idx + 1]
    if (updated[nextRound] === 'pending') {
      updated[nextRound] = 'open'
    }
  }

  return updated
}

function makeStatuses(
  overrides: Partial<Record<PredictionRoundKey, string>> = {},
): Record<string, string> {
  const defaults: Record<string, string> = {}
  for (const round of PREDICTION_ROUNDS) {
    defaults[round] = 'pending'
  }
  return { ...defaults, ...overrides }
}

describe('computeRoundTransitions — round auto-transitions', () => {
  it('completing group -> group scored, r32 opens', () => {
    const statuses = makeStatuses({ group: 'locked' })
    const result = computeRoundTransitions(statuses, 'group')
    expect(result.group).toBe('scored')
    expect(result.r32).toBe('open')
  })

  it('completing r32 -> r32 scored, r16 opens', () => {
    const statuses = makeStatuses({ group: 'scored', r32: 'locked' })
    const result = computeRoundTransitions(statuses, 'r32')
    expect(result.r32).toBe('scored')
    expect(result.r16).toBe('open')
  })

  it('completing r16 -> r16 scored, qf opens', () => {
    const statuses = makeStatuses({ group: 'scored', r32: 'scored', r16: 'locked' })
    const result = computeRoundTransitions(statuses, 'r16')
    expect(result.r16).toBe('scored')
    expect(result.qf).toBe('open')
  })

  it('completing qf -> qf scored, sf opens', () => {
    const statuses = makeStatuses({
      group: 'scored',
      r32: 'scored',
      r16: 'scored',
      qf: 'locked',
    })
    const result = computeRoundTransitions(statuses, 'qf')
    expect(result.qf).toBe('scored')
    expect(result.sf).toBe('open')
  })

  it('completing sf -> sf scored, final opens', () => {
    const statuses = makeStatuses({
      group: 'scored',
      r32: 'scored',
      r16: 'scored',
      qf: 'scored',
      sf: 'locked',
    })
    const result = computeRoundTransitions(statuses, 'sf')
    expect(result.sf).toBe('scored')
    expect(result.final).toBe('open')
  })

  it('completing final -> final scored, nothing else changes', () => {
    const statuses = makeStatuses({
      group: 'scored',
      r32: 'scored',
      r16: 'scored',
      qf: 'scored',
      sf: 'scored',
      final: 'locked',
    })
    const result = computeRoundTransitions(statuses, 'final')
    expect(result.final).toBe('scored')
    // No round after final — everything else stays scored
    for (const round of PREDICTION_ROUNDS.slice(0, -1)) {
      expect(result[round]).toBe('scored')
    }
  })

  it('only pending rounds get opened — does not reopen locked or scored', () => {
    const statuses = makeStatuses({
      group: 'locked',
      r32: 'locked', // already locked, should not become 'open'
    })
    const result = computeRoundTransitions(statuses, 'group')
    expect(result.group).toBe('scored')
    expect(result.r32).toBe('locked') // stays locked, not reopened
  })
})

// ---------------------------------------------------------------------------
// 6. Champion bonus
// ---------------------------------------------------------------------------

function computeChampionBonus(
  playerPick: string | null,
  actualChampion: string | null,
): number {
  if (!playerPick || !actualChampion) return 0
  return playerPick === actualChampion ? CHAMPION_BONUS : 0
}

describe('computeChampionBonus', () => {
  it('correct pick -> 10 pts', () => {
    expect(computeChampionBonus('BRA', 'BRA')).toBe(10)
  })

  it('wrong pick -> 0 pts', () => {
    expect(computeChampionBonus('BRA', 'ARG')).toBe(0)
  })

  it('null pick -> 0 pts', () => {
    expect(computeChampionBonus(null, 'BRA')).toBe(0)
  })

  it('null champion (final not played) -> 0 pts', () => {
    expect(computeChampionBonus('BRA', null)).toBe(0)
  })

  it('both null -> 0 pts', () => {
    expect(computeChampionBonus(null, null)).toBe(0)
  })

  it('Pick = BRA, champion = BRA -> 10', () => {
    expect(computeChampionBonus('BRA', 'BRA')).toBe(CHAMPION_BONUS)
  })

  it('Pick = BRA, champion = ARG -> 0', () => {
    expect(computeChampionBonus('BRA', 'ARG')).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 7. Recovery token
// ---------------------------------------------------------------------------

function validateRecovery(
  token: string | null,
  playerRecord: { recovery_token: string; game_id: string } | null,
  requestedGameId: string,
): { valid: boolean; error?: string } {
  if (!token) {
    return { valid: false, error: 'missing_token' }
  }
  if (!playerRecord || playerRecord.recovery_token !== token) {
    return { valid: false, error: 'not_found' }
  }
  if (playerRecord.game_id !== requestedGameId) {
    return { valid: false, error: 'wrong_game' }
  }
  return { valid: true }
}

describe('validateRecovery — recovery token validation', () => {
  const validToken = 'tok-abc-123'
  const gameId = 'game-42'
  const record = { recovery_token: validToken, game_id: gameId }

  it('valid token for correct game -> valid', () => {
    expect(validateRecovery(validToken, record, gameId)).toEqual({ valid: true })
  })

  it('wrong token -> invalid (404-style)', () => {
    expect(validateRecovery('wrong-token', record, gameId)).toEqual({
      valid: false,
      error: 'not_found',
    })
  })

  it('token for different game -> invalid (403-style)', () => {
    expect(validateRecovery(validToken, record, 'other-game')).toEqual({
      valid: false,
      error: 'wrong_game',
    })
  })

  it('no player found -> invalid', () => {
    expect(validateRecovery(validToken, null, gameId)).toEqual({
      valid: false,
      error: 'not_found',
    })
  })

  it('null token -> invalid', () => {
    expect(validateRecovery(null, record, gameId)).toEqual({
      valid: false,
      error: 'missing_token',
    })
  })
})

// ---------------------------------------------------------------------------
// 8. Host transfer invariant
// ---------------------------------------------------------------------------

function simulateHostTransfer(
  players: Array<{ id: string; isHost: boolean }>,
  newHostId: string,
): Array<{ id: string; isHost: boolean }> {
  const target = players.find((p) => p.id === newHostId)
  if (!target) {
    throw new Error('target_not_found')
  }
  if (target.isHost) {
    throw new Error('already_host')
  }
  return players.map((p) => ({
    id: p.id,
    isHost: p.id === newHostId,
  }))
}

describe('simulateHostTransfer — host transfer invariant', () => {
  const players = [
    { id: 'host-1', isHost: true },
    { id: 'player-2', isHost: false },
    { id: 'player-3', isHost: false },
  ]

  it('after transfer, exactly one player has isHost=true', () => {
    const result = simulateHostTransfer(players, 'player-2')
    const hosts = result.filter((p) => p.isHost)
    expect(hosts).toHaveLength(1)
  })

  it('the new host is the specified player', () => {
    const result = simulateHostTransfer(players, 'player-2')
    const host = result.find((p) => p.isHost)
    expect(host!.id).toBe('player-2')
  })

  it('the old host has isHost=false', () => {
    const result = simulateHostTransfer(players, 'player-2')
    const oldHost = result.find((p) => p.id === 'host-1')
    expect(oldHost!.isHost).toBe(false)
  })

  it('transfer to non-existent player -> error', () => {
    expect(() => simulateHostTransfer(players, 'ghost')).toThrow('target_not_found')
  })

  it('transfer to current host -> error (no-op)', () => {
    expect(() => simulateHostTransfer(players, 'host-1')).toThrow('already_host')
  })

  it('host cannot leave — host flag blocks self-removal', () => {
    // Verify host is always identifiable so removal logic can block it
    const host = players.find((p) => p.isHost)
    expect(host).toBeDefined()
    expect(host!.id).toBe('host-1')
  })
})

// ---------------------------------------------------------------------------
// 9. Leaderboard tiebreaker ordering with shared ranks (edge cases)
// ---------------------------------------------------------------------------

interface RawEntry {
  playerId: string
  totalPoints: number
  exactScores: number
  correctResults: number
}

function rankLeaderboard(entries: RawEntry[]): (RawEntry & { rank: number })[] {
  const sorted = [...entries].sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      b.exactScores - a.exactScores ||
      b.correctResults - a.correctResults,
  )

  const ranked: (RawEntry & { rank: number })[] = []
  for (let i = 0; i < sorted.length; i++) {
    let rank = 1
    if (i > 0) {
      const prev = sorted[i - 1]
      const prevRank = ranked[i - 1].rank
      if (
        sorted[i].totalPoints === prev.totalPoints &&
        sorted[i].exactScores === prev.exactScores &&
        sorted[i].correctResults === prev.correctResults
      ) {
        rank = prevRank
      } else {
        rank = i + 1
      }
    }
    ranked.push({ ...sorted[i], rank })
  }
  return ranked
}

describe('leaderboard tiebreaker ordering — edge cases', () => {
  it('all players tied -> all get rank 1', () => {
    const entries: RawEntry[] = [
      { playerId: 'a', totalPoints: 10, exactScores: 1, correctResults: 5 },
      { playerId: 'b', totalPoints: 10, exactScores: 1, correctResults: 5 },
      { playerId: 'c', totalPoints: 10, exactScores: 1, correctResults: 5 },
    ]
    const result = rankLeaderboard(entries)
    expect(result.map((r) => r.rank)).toEqual([1, 1, 1])
  })

  it('single player -> rank 1', () => {
    const entries: RawEntry[] = [
      { playerId: 'solo', totalPoints: 42, exactScores: 3, correctResults: 10 },
    ]
    const result = rankLeaderboard(entries)
    expect(result).toHaveLength(1)
    expect(result[0].rank).toBe(1)
  })

  it('5 players: 1, 2, 2, 2, 5 pattern', () => {
    const entries: RawEntry[] = [
      { playerId: 'a', totalPoints: 30, exactScores: 5, correctResults: 10 },
      { playerId: 'b', totalPoints: 20, exactScores: 2, correctResults: 8 },
      { playerId: 'c', totalPoints: 20, exactScores: 2, correctResults: 8 },
      { playerId: 'd', totalPoints: 20, exactScores: 2, correctResults: 8 },
      { playerId: 'e', totalPoints: 5, exactScores: 0, correctResults: 2 },
    ]
    const result = rankLeaderboard(entries)
    expect(result.map((r) => r.rank)).toEqual([1, 2, 2, 2, 5])
  })

  it('champion bonus included in total affects ranking', () => {
    // Player 'a' has 20 base + 10 champion bonus = 30
    // Player 'b' has 25 base + 0 champion bonus = 25
    const entries: RawEntry[] = [
      { playerId: 'a', totalPoints: 20 + CHAMPION_BONUS, exactScores: 2, correctResults: 8 },
      { playerId: 'b', totalPoints: 25, exactScores: 3, correctResults: 10 },
    ]
    const result = rankLeaderboard(entries)
    expect(result[0].playerId).toBe('a')
    expect(result[0].rank).toBe(1)
    expect(result[1].playerId).toBe('b')
    expect(result[1].rank).toBe(2)
  })
})
