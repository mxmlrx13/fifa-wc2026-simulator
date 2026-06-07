import { describe, it, expect } from 'vitest'
import { generateGroupScore, quickFillGroupMatches, quickFillKnockoutPicks } from '../quick-fill'
import { groupFixtures } from '@/lib/data/fixtures'
import type { GroupMatch } from '@/lib/types'

describe('generateGroupScore', () => {
  it('should return scores in range [0, 4]', () => {
    for (let seed = 0; seed < 100; seed++) {
      const [h, a] = generateGroupScore('BRA', 'CUW', seed)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(4)
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThanOrEqual(4)
    }
  })

  it('should be deterministic for the same seed', () => {
    const [h1, a1] = generateGroupScore('BRA', 'CUW', 42)
    const [h2, a2] = generateGroupScore('BRA', 'CUW', 42)
    expect(h1).toBe(h2)
    expect(a1).toBe(a2)
  })

  it('should return integers', () => {
    for (let seed = 0; seed < 50; seed++) {
      const [h, a] = generateGroupScore('MEX', 'ZAF', seed)
      expect(Number.isInteger(h)).toBe(true)
      expect(Number.isInteger(a)).toBe(true)
    }
  })

  it('should produce varied results across different seeds', () => {
    const results = new Set<string>()
    for (let seed = 0; seed < 50; seed++) {
      const [h, a] = generateGroupScore('FRA', 'NOR', seed)
      results.add(`${h}-${a}`)
    }
    // Should produce at least a few different scorelines
    expect(results.size).toBeGreaterThan(2)
  })
})

describe('quickFillGroupMatches', () => {
  it('should fill all 72 group matches when all are empty', () => {
    const { filled, filledIds } = quickFillGroupMatches(groupFixtures)
    expect(filledIds.size).toBe(72)
    for (const m of filled) {
      expect(m.homeScore).not.toBeNull()
      expect(m.awayScore).not.toBeNull()
    }
  })

  it('should never overwrite existing predictions', () => {
    const modified: GroupMatch[] = groupFixtures.map((m, i) => {
      if (i === 0) return { ...m, homeScore: 9, awayScore: 9 }
      return m
    })

    const { filled, filledIds } = quickFillGroupMatches(modified)
    // First match should be untouched
    expect(filled[0].homeScore).toBe(9)
    expect(filled[0].awayScore).toBe(9)
    expect(filledIds.has(modified[0].id)).toBe(false)
    // All others should be filled
    expect(filledIds.size).toBe(71)
  })

  it('should return empty filledIds when all matches are already filled', () => {
    const allFilled: GroupMatch[] = groupFixtures.map((m) => ({
      ...m,
      homeScore: 1,
      awayScore: 0,
    }))
    const { filledIds } = quickFillGroupMatches(allFilled)
    expect(filledIds.size).toBe(0)
  })

  it('should produce scores within valid range', () => {
    const { filled } = quickFillGroupMatches(groupFixtures)
    for (const m of filled) {
      expect(m.homeScore).toBeGreaterThanOrEqual(0)
      expect(m.homeScore).toBeLessThanOrEqual(4)
      expect(m.awayScore).toBeGreaterThanOrEqual(0)
      expect(m.awayScore).toBeLessThanOrEqual(4)
    }
  })
})

describe('quickFillKnockoutPicks', () => {
  it('should pick higher-ranked team', () => {
    const fixtures = [
      { matchId: 73, homeTeamId: 'BRA', awayTeamId: 'CUW' }, // BRA ranked 5, CUW ranked 93
    ]
    const picks = quickFillKnockoutPicks(fixtures, {})
    expect(picks[73]).toBe('BRA')
  })

  it('should not overwrite existing picks', () => {
    const fixtures = [
      { matchId: 73, homeTeamId: 'BRA', awayTeamId: 'CUW' },
    ]
    const existing = { 73: 'CUW' }
    const picks = quickFillKnockoutPicks(fixtures, existing)
    expect(picks[73]).toBeUndefined()
  })

  it('should skip fixtures with unresolved teams', () => {
    const fixtures = [
      { matchId: 89, homeTeamId: null, awayTeamId: 'BRA' },
      { matchId: 90, homeTeamId: 'FRA', awayTeamId: null },
    ]
    const picks = quickFillKnockoutPicks(fixtures, {})
    expect(Object.keys(picks)).toHaveLength(0)
  })

  it('should pick correctly when away team is higher ranked', () => {
    const fixtures = [
      { matchId: 73, homeTeamId: 'CUW', awayTeamId: 'ESP' }, // CUW ranked 93, ESP ranked 1
    ]
    const picks = quickFillKnockoutPicks(fixtures, {})
    expect(picks[73]).toBe('ESP')
  })
})

describe('quick-fill purity and immutability', () => {
  it('should not mutate the original matches array', () => {
    const original = groupFixtures.map((m) => ({ ...m }))
    const originalSnapshot = JSON.stringify(original)
    quickFillGroupMatches(original)
    expect(JSON.stringify(original)).toBe(originalSnapshot)
  })

  it('should be referentially stable — same input produces same output', () => {
    const input = groupFixtures.map((m) => ({ ...m }))
    const run1 = quickFillGroupMatches(input)
    const run2 = quickFillGroupMatches(input)

    expect(run1.filled.map((m) => [m.id, m.homeScore, m.awayScore]))
      .toEqual(run2.filled.map((m) => [m.id, m.homeScore, m.awayScore]))
    expect([...run1.filledIds].sort()).toEqual([...run2.filledIds].sort())
  })

  it('should produce integer scores for all team combinations', () => {
    const { filled } = quickFillGroupMatches(groupFixtures)
    for (const m of filled) {
      expect(Number.isInteger(m.homeScore)).toBe(true)
      expect(Number.isInteger(m.awayScore)).toBe(true)
    }
  })

  it('quickFillKnockoutPicks should not mutate existingPicks', () => {
    const fixtures = [
      { matchId: 73, homeTeamId: 'BRA', awayTeamId: 'CUW' },
      { matchId: 74, homeTeamId: 'FRA', awayTeamId: 'NOR' },
    ]
    const existing: Record<number, string> = { 73: 'CUW' }
    const existingSnapshot = JSON.stringify(existing)
    quickFillKnockoutPicks(fixtures, existing)
    expect(JSON.stringify(existing)).toBe(existingSnapshot)
  })
})
