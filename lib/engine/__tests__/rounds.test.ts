import { describe, it, expect } from 'vitest'
import { getMatchIdsForRound, getRoundLabel, getNextRound } from '../rounds'

describe('rounds', () => {
  it('returns 24 match IDs for each group matchday', () => {
    expect(getMatchIdsForRound('group_md1')).toHaveLength(24)
    expect(getMatchIdsForRound('group_md2')).toHaveLength(24)
    expect(getMatchIdsForRound('group_md3')).toHaveLength(24)
  })

  it('returns correct knockout match counts', () => {
    expect(getMatchIdsForRound('r32')).toHaveLength(16)
    expect(getMatchIdsForRound('r16')).toHaveLength(8)
    expect(getMatchIdsForRound('qf')).toHaveLength(4)
    expect(getMatchIdsForRound('sf')).toHaveLength(3) // 2 SF + 3rd place
    expect(getMatchIdsForRound('final')).toHaveLength(1)
  })

  it('group matchday 1 IDs include match 1 and are within 1-72', () => {
    const ids = getMatchIdsForRound('group_md1')
    expect(ids).toContain(1)
    expect(ids.every((id) => id >= 1 && id <= 72)).toBe(true)
  })

  it('returns human-readable labels', () => {
    expect(getRoundLabel('group_md1')).toBe('Group Stage — Matchday 1')
    expect(getRoundLabel('final')).toBe('Final')
  })

  it('getNextRound advances correctly', () => {
    expect(getNextRound('group_md1')).toBe('group_md2')
    expect(getNextRound('sf')).toBe('final')
    expect(getNextRound('final')).toBeNull()
  })
})
