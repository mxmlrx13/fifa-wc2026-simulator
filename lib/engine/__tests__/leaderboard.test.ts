import { describe, it, expect } from 'vitest'
import { computeLeaderboard, computeMovement, getPreviousBatch } from '../leaderboard'
import { getAllRounds } from '../rounds'

const players = [
  { id: 'p1', display_name: 'Alice', is_host: true },
  { id: 'p2', display_name: 'Bob', is_host: false },
  { id: 'p3', display_name: 'Carol', is_host: false },
]

describe('computeLeaderboard', () => {
  it('ranks players by total points descending', () => {
    const scores = [
      { player_id: 'p1', points: 5, match_id: 1 },
      { player_id: 'p1', points: 3, match_id: 2 },
      { player_id: 'p2', points: 5, match_id: 1 },
      { player_id: 'p2', points: 5, match_id: 2 },
      { player_id: 'p3', points: 1, match_id: 1 },
    ]
    const lb = computeLeaderboard(players, scores)
    expect(lb[0].playerId).toBe('p2')
    expect(lb[0].totalPoints).toBe(10)
    expect(lb[0].rank).toBe(1)
    expect(lb[1].playerId).toBe('p1')
    expect(lb[1].totalPoints).toBe(8)
    expect(lb[1].rank).toBe(2)
    expect(lb[2].playerId).toBe('p3')
    expect(lb[2].rank).toBe(3)
  })

  it('assigns shared ranks when tied', () => {
    const scores = [
      { player_id: 'p1', points: 5, match_id: 1 },
      { player_id: 'p2', points: 5, match_id: 1 },
      { player_id: 'p3', points: 1, match_id: 1 },
    ]
    const lb = computeLeaderboard(players, scores)
    expect(lb[0].rank).toBe(1)
    expect(lb[1].rank).toBe(1) // tied
    expect(lb[2].rank).toBe(3) // skip to 3
  })

  it('uses exactScores as tiebreaker', () => {
    const scores = [
      { player_id: 'p1', points: 5, match_id: 1 },
      { player_id: 'p1', points: 1, match_id: 2 },
      { player_id: 'p2', points: 3, match_id: 1 },
      { player_id: 'p2', points: 3, match_id: 2 },
    ]
    const lb = computeLeaderboard(players, scores)
    // Both have 6 points; p1 has 1 exact, p2 has 0
    expect(lb[0].playerId).toBe('p1')
    expect(lb[1].playerId).toBe('p2')
  })

  it('handles empty scores', () => {
    const lb = computeLeaderboard(players, [])
    expect(lb).toHaveLength(3)
    expect(lb[0].rank).toBe(1)
    expect(lb[1].rank).toBe(1) // all tied at 0
    expect(lb[2].rank).toBe(1)
  })

  it('counts champion bonus separately (match_id 0)', () => {
    const scores = [
      { player_id: 'p1', points: 10, match_id: 0 },
      { player_id: 'p1', points: 5, match_id: 1 },
    ]
    const lb = computeLeaderboard(players, scores)
    const alice = lb.find((e) => e.playerId === 'p1')!
    expect(alice.championBonus).toBe(10)
    expect(alice.matchesScored).toBe(1)
    expect(alice.totalPoints).toBe(15)
  })

  it('skips rank after shared rank (1, 2, 2, 4)', () => {
    const fourPlayers = [
      ...players,
      { id: 'p4', display_name: 'Dave', is_host: false },
    ]
    const scores = [
      { player_id: 'p1', points: 5, match_id: 1 },
      { player_id: 'p1', points: 5, match_id: 2 },
      { player_id: 'p1', points: 5, match_id: 3 },
      { player_id: 'p2', points: 5, match_id: 1 },
      { player_id: 'p2', points: 3, match_id: 2 },
      { player_id: 'p3', points: 5, match_id: 1 },
      { player_id: 'p3', points: 3, match_id: 2 },
      { player_id: 'p4', points: 1, match_id: 1 },
    ]
    const lb = computeLeaderboard(fourPlayers, scores)
    expect(lb.map((e) => e.rank)).toEqual([1, 2, 2, 4])
  })
})

describe('computeMovement', () => {
  it('returns new for first batch (no previous snapshot)', () => {
    const leaderboard = computeLeaderboard(players, [
      { player_id: 'p1', points: 5, match_id: 1 },
    ])
    const movement = computeMovement(leaderboard, null)
    expect(movement.get('p1')!.direction).toBe('new')
    expect(movement.get('p2')!.direction).toBe('new')
    expect(movement.get('p3')!.direction).toBe('new')
  })

  it('returns new for empty previous snapshot', () => {
    const leaderboard = computeLeaderboard(players, [
      { player_id: 'p1', points: 5, match_id: 1 },
    ])
    const movement = computeMovement(leaderboard, [])
    expect(movement.get('p1')!.direction).toBe('new')
  })

  it('detects upward movement', () => {
    const leaderboard = computeLeaderboard(players, [
      { player_id: 'p1', points: 10, match_id: 1 },
      { player_id: 'p2', points: 5, match_id: 1 },
      { player_id: 'p3', points: 3, match_id: 1 },
    ])
    const prev = [
      { player_id: 'p2', rank: 1 },
      { player_id: 'p1', rank: 2 },
      { player_id: 'p3', rank: 3 },
    ]
    const movement = computeMovement(leaderboard, prev)
    expect(movement.get('p1')).toEqual({ direction: 'up', delta: 1 })
    expect(movement.get('p2')).toEqual({ direction: 'down', delta: 1 })
    expect(movement.get('p3')).toEqual({ direction: 'same', delta: 0 })
  })

  it('detects downward movement', () => {
    const leaderboard = computeLeaderboard(players, [
      { player_id: 'p1', points: 5, match_id: 1 },
      { player_id: 'p2', points: 3, match_id: 1 },
      { player_id: 'p3', points: 1, match_id: 1 },
    ])
    const prev = [
      { player_id: 'p3', rank: 1 },
      { player_id: 'p2', rank: 2 },
      { player_id: 'p1', rank: 3 },
    ]
    const movement = computeMovement(leaderboard, prev)
    expect(movement.get('p1')).toEqual({ direction: 'up', delta: 2 })
    expect(movement.get('p3')).toEqual({ direction: 'down', delta: 2 })
  })

  it('treats missing player in previous as new (late joiner)', () => {
    const fourPlayers = [
      ...players,
      { id: 'p4', display_name: 'Dave', is_host: false },
    ]
    const leaderboard = computeLeaderboard(fourPlayers, [
      { player_id: 'p4', points: 10, match_id: 1 },
    ])
    const prev = [
      { player_id: 'p1', rank: 1 },
      { player_id: 'p2', rank: 2 },
      { player_id: 'p3', rank: 3 },
    ]
    const movement = computeMovement(leaderboard, prev)
    expect(movement.get('p4')!.direction).toBe('new')
  })

  it('handles ties sharing rank with no movement', () => {
    const leaderboard = computeLeaderboard(players, [
      { player_id: 'p1', points: 5, match_id: 1 },
      { player_id: 'p2', points: 5, match_id: 1 },
    ])
    const prev = [
      { player_id: 'p1', rank: 1 },
      { player_id: 'p2', rank: 1 },
      { player_id: 'p3', rank: 3 },
    ]
    const movement = computeMovement(leaderboard, prev)
    expect(movement.get('p1')!.direction).toBe('same')
    expect(movement.get('p2')!.direction).toBe('same')
  })
})

describe('getPreviousBatch', () => {
  it('returns null for first batch', () => {
    expect(getPreviousBatch('group_md1')).toBeNull()
  })

  it('returns previous batch in order', () => {
    expect(getPreviousBatch('group_md2')).toBe('group_md1')
    expect(getPreviousBatch('group_md3')).toBe('group_md2')
    expect(getPreviousBatch('r32')).toBe('group_md3')
    expect(getPreviousBatch('final')).toBe('sf')
  })

  it('covers entire round sequence without gaps', () => {
    const allRounds = getAllRounds()
    for (let i = 1; i < allRounds.length; i++) {
      expect(getPreviousBatch(allRounds[i])).toBe(allRounds[i - 1])
    }
  })
})

describe('Snapshot/movement matrix across batches', () => {
  it('simulates MD1 → MD2 → MD3 snapshot progression', () => {
    // MD1: p1 leads
    const scoresMd1 = [
      { player_id: 'p1', points: 15, match_id: 1 },
      { player_id: 'p2', points: 10, match_id: 1 },
      { player_id: 'p3', points: 5, match_id: 1 },
    ]
    const lb1 = computeLeaderboard(players, scoresMd1)
    expect(lb1.map((e) => e.playerId)).toEqual(['p1', 'p2', 'p3'])

    // Snapshot from MD1
    const snap1 = lb1.map((e) => ({ player_id: e.playerId, rank: e.rank }))

    // MD2: p3 surges, p1 stagnates
    const scoresMd2 = [
      ...scoresMd1,
      { player_id: 'p1', points: 0, match_id: 2 },
      { player_id: 'p2', points: 5, match_id: 2 },
      { player_id: 'p3', points: 20, match_id: 2 },
    ]
    const lb2 = computeLeaderboard(players, scoresMd2)
    expect(lb2[0].playerId).toBe('p3') // p3 now first (25 pts)

    const movement2 = computeMovement(lb2, snap1)
    expect(movement2.get('p3')!.direction).toBe('up')
    expect(movement2.get('p3')!.delta).toBe(2)
    expect(movement2.get('p1')!.direction).toBe('down')

    // Snapshot from MD2
    const snap2 = lb2.map((e) => ({ player_id: e.playerId, rank: e.rank }))

    // MD3: p1 bounces back to top
    const scoresMd3 = [
      ...scoresMd2,
      { player_id: 'p1', points: 25, match_id: 3 },
      { player_id: 'p2', points: 5, match_id: 3 },
      { player_id: 'p3', points: 1, match_id: 3 },
    ]
    const lb3 = computeLeaderboard(players, scoresMd3)
    expect(lb3[0].playerId).toBe('p1') // p1 back on top (40 pts)

    const movement3 = computeMovement(lb3, snap2)
    expect(movement3.get('p1')!.direction).toBe('up')
    expect(movement3.get('p3')!.direction).toBe('down')
  })

  it('produces one snapshot row per player per batch', () => {
    const scores = [
      { player_id: 'p1', points: 5, match_id: 1 },
      { player_id: 'p2', points: 3, match_id: 1 },
      { player_id: 'p3', points: 1, match_id: 1 },
    ]
    const lb = computeLeaderboard(players, scores)
    // Each player gets exactly one leaderboard entry (= one snapshot row)
    expect(lb).toHaveLength(players.length)
    const playerIds = new Set(lb.map((e) => e.playerId))
    expect(playerIds.size).toBe(players.length)
  })

  it('round recap: movement delta is always non-negative', () => {
    const scores = [
      { player_id: 'p1', points: 10, match_id: 1 },
      { player_id: 'p2', points: 5, match_id: 1 },
      { player_id: 'p3', points: 8, match_id: 1 },
    ]
    const lb = computeLeaderboard(players, scores)
    const prev = [
      { player_id: 'p1', rank: 3 },
      { player_id: 'p2', rank: 1 },
      { player_id: 'p3', rank: 2 },
    ]
    const movement = computeMovement(lb, prev)
    for (const [, m] of movement) {
      expect(m.delta).toBeGreaterThanOrEqual(0)
    }
  })
})
