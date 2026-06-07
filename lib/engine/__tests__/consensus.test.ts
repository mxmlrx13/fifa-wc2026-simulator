import { describe, it, expect } from 'vitest'
import {
  computeChampionVotes,
  computeGroupWinnerConsensus,
  computeBoldestPicks,
  computePickSplits,
} from '../consensus'

describe('computeChampionVotes', () => {
  it('counts and sorts champion votes', () => {
    const players = [
      { id: 'p1', championPick: 'BRA' },
      { id: 'p2', championPick: 'FRA' },
      { id: 'p3', championPick: 'BRA' },
      { id: 'p4', championPick: 'ARG' },
      { id: 'p5', championPick: 'BRA' },
    ]
    const votes = computeChampionVotes(players)
    expect(votes[0]).toEqual({ teamId: 'BRA', count: 3, total: 5 })
    expect(votes[1]).toEqual({ teamId: 'FRA', count: 1, total: 5 })
    expect(votes[2]).toEqual({ teamId: 'ARG', count: 1, total: 5 })
  })

  it('returns empty when no champion picks', () => {
    const players = [
      { id: 'p1', championPick: null },
      { id: 'p2', championPick: null },
    ]
    expect(computeChampionVotes(players)).toEqual([])
  })

  it('handles single player', () => {
    const players = [{ id: 'p1', championPick: 'ENG' }]
    const votes = computeChampionVotes(players)
    expect(votes).toEqual([{ teamId: 'ENG', count: 1, total: 1 }])
  })
})

describe('computeGroupWinnerConsensus', () => {
  it('finds the most-predicted group A winner', () => {
    // Group A: MEX, ZAF, KOR, CZE
    // Fixtures: match 1: MEX vs ZAF, match 2: KOR vs CZE,
    //           match 3: MEX vs KOR, match 4: CZE vs ZAF,
    //           match 5: CZE vs MEX, match 6: ZAF vs KOR

    // Player 1 predicts MEX wins all 3 games
    const p1Preds = [
      { player_id: 'p1', match_id: 1, home_score: 2, away_score: 0 }, // MEX beats ZAF
      { player_id: 'p1', match_id: 2, home_score: 1, away_score: 1 }, // KOR draws CZE
      { player_id: 'p1', match_id: 3, home_score: 3, away_score: 0 }, // MEX beats KOR
      { player_id: 'p1', match_id: 4, home_score: 0, away_score: 1 }, // ZAF beats CZE
      { player_id: 'p1', match_id: 5, home_score: 0, away_score: 2 }, // MEX beats CZE
      { player_id: 'p1', match_id: 6, home_score: 0, away_score: 0 }, // ZAF draws KOR
    ]

    // Player 2 also predicts MEX wins group
    const p2Preds = [
      { player_id: 'p2', match_id: 1, home_score: 1, away_score: 0 },
      { player_id: 'p2', match_id: 2, home_score: 0, away_score: 2 },
      { player_id: 'p2', match_id: 3, home_score: 2, away_score: 1 },
      { player_id: 'p2', match_id: 4, home_score: 1, away_score: 0 },
      { player_id: 'p2', match_id: 5, home_score: 0, away_score: 1 },
      { player_id: 'p2', match_id: 6, home_score: 2, away_score: 0 },
    ]

    // Player 3 predicts KOR wins group
    const p3Preds = [
      { player_id: 'p3', match_id: 1, home_score: 0, away_score: 0 },
      { player_id: 'p3', match_id: 2, home_score: 3, away_score: 0 },
      { player_id: 'p3', match_id: 3, home_score: 0, away_score: 2 },
      { player_id: 'p3', match_id: 4, home_score: 1, away_score: 0 },
      { player_id: 'p3', match_id: 5, home_score: 1, away_score: 0 },
      { player_id: 'p3', match_id: 6, home_score: 1, away_score: 0 },
    ]

    const predictions = [...p1Preds, ...p2Preds, ...p3Preds]
    const result = computeGroupWinnerConsensus(predictions, ['p1', 'p2', 'p3'])

    // Group A consensus: MEX has 2 votes, KOR has 1
    const groupA = result.find((r) => r.groupId === 'A')
    expect(groupA).toBeDefined()
    expect(groupA!.teamId).toBe('MEX')
    expect(groupA!.count).toBe(2)
    expect(groupA!.total).toBe(3)
  })

  it('skips players with incomplete group predictions', () => {
    // Only fill 4 of 6 matches for group A
    const preds = [
      { player_id: 'p1', match_id: 1, home_score: 2, away_score: 0 },
      { player_id: 'p1', match_id: 2, home_score: 1, away_score: 1 },
      { player_id: 'p1', match_id: 3, home_score: 3, away_score: 0 },
      { player_id: 'p1', match_id: 4, home_score: 0, away_score: 1 },
      // Missing matches 5, 6
    ]
    const result = computeGroupWinnerConsensus(preds, ['p1'])
    const groupA = result.find((r) => r.groupId === 'A')
    expect(groupA).toBeUndefined()
  })
})

describe('computeBoldestPicks', () => {
  it('finds unique champion picks', () => {
    const players = [
      { id: 'p1', displayName: 'Alice', championPick: 'BRA' },
      { id: 'p2', displayName: 'Bob', championPick: 'BRA' },
      { id: 'p3', displayName: 'Carol', championPick: 'HTI' },
    ]
    const picks = computeBoldestPicks(players, [])
    expect(picks).toEqual([
      {
        playerId: 'p3',
        displayName: 'Carol',
        teamId: 'HTI',
        type: 'champion',
      },
    ])
  })

  it('finds unique knockout picks', () => {
    const players = [
      { id: 'p1', displayName: 'Alice', championPick: null },
      { id: 'p2', displayName: 'Bob', championPick: null },
      { id: 'p3', displayName: 'Carol', championPick: null },
    ]
    const koPreds = [
      { player_id: 'p1', match_id: 73, winner_id: 'BRA' },
      { player_id: 'p2', match_id: 73, winner_id: 'BRA' },
      { player_id: 'p3', match_id: 73, winner_id: 'MEX' },
    ]
    const picks = computeBoldestPicks(players, koPreds)
    expect(picks).toHaveLength(1)
    expect(picks[0].displayName).toBe('Carol')
    expect(picks[0].teamId).toBe('MEX')
    expect(picks[0].type).toBe('knockout')
    expect(picks[0].matchId).toBe(73)
  })

  it('returns empty when all picks are shared', () => {
    const players = [
      { id: 'p1', displayName: 'Alice', championPick: 'BRA' },
      { id: 'p2', displayName: 'Bob', championPick: 'BRA' },
    ]
    expect(computeBoldestPicks(players, [])).toEqual([])
  })
})

describe('computePickSplits', () => {
  it('computes per-fixture pick splits', () => {
    const preds = [
      { player_id: 'p1', match_id: 73, winner_id: 'BRA' },
      { player_id: 'p2', match_id: 73, winner_id: 'BRA' },
      { player_id: 'p3', match_id: 73, winner_id: 'DEU' },
      { player_id: 'p1', match_id: 74, winner_id: 'FRA' },
      { player_id: 'p2', match_id: 74, winner_id: 'ARG' },
    ]
    const splits = computePickSplits(preds)
    expect(splits).toHaveLength(2)

    const m73 = splits.find((s) => s.matchId === 73)!
    expect(m73.teams).toEqual({ BRA: 2, DEU: 1 })
    expect(m73.total).toBe(3)

    const m74 = splits.find((s) => s.matchId === 74)!
    expect(m74.teams).toEqual({ FRA: 1, ARG: 1 })
    expect(m74.total).toBe(2)
  })

  it('ignores predictions without winner_id', () => {
    const preds = [
      { player_id: 'p1', match_id: 73, winner_id: null },
      { player_id: 'p2', match_id: 73, winner_id: 'BRA' },
    ]
    const splits = computePickSplits(preds)
    expect(splits).toHaveLength(1)
    expect(splits[0].total).toBe(1)
  })
})
