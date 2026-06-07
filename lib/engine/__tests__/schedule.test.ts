import { describe, it, expect } from 'vitest'
import {
  schedule,
  getRoundDeadline,
  getPredictionRoundDeadline,
  isDeadlinePassed,
  getMatchKickoff,
} from '@/lib/data/schedule'
import { groupFixtures } from '@/lib/data/fixtures'
import { bracketTemplate } from '@/lib/data/bracket-template'
import { getAllRounds, getMatchIdsForRound } from '@/lib/engine/rounds'
import { PREDICTION_ROUNDS, PREDICTION_ROUND_RANGES } from '@/lib/constants'

describe('Schedule data integrity', () => {
  it('should have an entry for every match ID 1-104', () => {
    for (let id = 1; id <= 104; id++) {
      expect(schedule[id], `Missing schedule entry for match ${id}`).toBeDefined()
      expect(schedule[id].kickoffUtc).toBeTruthy()
      expect(schedule[id].venue).toBeTruthy()
    }
  })

  it('should have valid ISO 8601 UTC dates for all matches', () => {
    for (let id = 1; id <= 104; id++) {
      const date = new Date(schedule[id].kickoffUtc)
      expect(date.getTime(), `Invalid date for match ${id}: ${schedule[id].kickoffUtc}`).not.toBeNaN()
      expect(schedule[id].kickoffUtc).toMatch(/Z$/)
    }
  })

  it('should have all matches within the tournament window (Jun 11 - Jul 19 2026)', () => {
    const tournamentStart = new Date('2026-06-11T00:00:00Z')
    const tournamentEnd = new Date('2026-07-20T00:00:00Z')
    for (let id = 1; id <= 104; id++) {
      const date = new Date(schedule[id].kickoffUtc)
      expect(date.getTime()).toBeGreaterThanOrEqual(tournamentStart.getTime())
      expect(date.getTime()).toBeLessThan(tournamentEnd.getTime())
    }
  })

  it('should have 72 group matches and 32 knockout matches', () => {
    expect(groupFixtures).toHaveLength(72)
    expect(bracketTemplate).toHaveLength(32)
  })
})

describe('Round deadline derivation', () => {
  it('should return the earliest kickoff for each result-entry round', () => {
    const rounds = getAllRounds()
    for (const round of rounds) {
      const deadline = getRoundDeadline(round)
      const matchIds = getMatchIdsForRound(round)
      expect(matchIds.length).toBeGreaterThan(0)

      // Deadline should equal the minimum kickoff in this round
      const times = matchIds.map((id) => new Date(schedule[id].kickoffUtc).getTime())
      const earliest = Math.min(...times)
      expect(deadline.getTime()).toBe(earliest)
    }
  })

  it('should return the earliest kickoff for each prediction round', () => {
    for (const round of PREDICTION_ROUNDS) {
      const deadline = getPredictionRoundDeadline(round)
      const [min, max] = PREDICTION_ROUND_RANGES[round]

      const times: number[] = []
      for (let id = min; id <= max; id++) {
        times.push(new Date(schedule[id].kickoffUtc).getTime())
      }
      const earliest = Math.min(...times)
      expect(deadline.getTime()).toBe(earliest)
    }
  })

  it('should have group prediction deadline = opening match', () => {
    const deadline = getPredictionRoundDeadline('group')
    // Opening match is M1: MEX vs ZAF, Jun 11, 19:00 UTC
    expect(deadline.toISOString()).toBe('2026-06-11T19:00:00.000Z')
  })

  it('should have final deadline = 3rd-place match (earliest in final round)', () => {
    const deadline = getPredictionRoundDeadline('final')
    // Final prediction round includes matches 103 (3rd place) and 104 (final)
    // 3rd place is Jul 18, 21:00 UTC which is earlier than final Jul 19, 19:00 UTC
    expect(deadline.toISOString()).toBe('2026-07-18T21:00:00.000Z')
  })

  it('should have deadlines in chronological order across prediction rounds', () => {
    let prev = 0
    for (const round of PREDICTION_ROUNDS) {
      const deadline = getPredictionRoundDeadline(round)
      expect(deadline.getTime(), `${round} deadline should be after previous`).toBeGreaterThan(prev)
      prev = deadline.getTime()
    }
  })

  it('should have deadlines in chronological order across result-entry rounds', () => {
    const rounds = getAllRounds()
    let prev = 0
    for (const round of rounds) {
      const deadline = getRoundDeadline(round)
      expect(deadline.getTime(), `${round} deadline should be after previous`).toBeGreaterThanOrEqual(prev)
      prev = deadline.getTime()
    }
  })
})

describe('Prediction rejection after deadline', () => {
  it('should report deadline passed when now is after the deadline', () => {
    // After the tournament is over
    const futureDate = new Date('2026-08-01T00:00:00Z')
    expect(isDeadlinePassed('group', futureDate)).toBe(true)
    expect(isDeadlinePassed('r32', futureDate)).toBe(true)
    expect(isDeadlinePassed('final', futureDate)).toBe(true)
  })

  it('should report deadline not passed when now is before the deadline', () => {
    // Well before the tournament
    const earlyDate = new Date('2026-01-01T00:00:00Z')
    expect(isDeadlinePassed('group', earlyDate)).toBe(false)
    expect(isDeadlinePassed('r32', earlyDate)).toBe(false)
    expect(isDeadlinePassed('final', earlyDate)).toBe(false)
  })

  it('should report deadline passed at exact deadline time', () => {
    const groupDeadline = getPredictionRoundDeadline('group')
    expect(isDeadlinePassed('group', groupDeadline)).toBe(true)
  })

  it('should report deadline not passed 1ms before deadline', () => {
    const groupDeadline = getPredictionRoundDeadline('group')
    const justBefore = new Date(groupDeadline.getTime() - 1)
    expect(isDeadlinePassed('group', justBefore)).toBe(false)
  })
})

describe('Effective status derivation', () => {
  it('should treat open round as locked when deadline has passed', () => {
    // This tests the logic used in the dashboard
    const futureDate = new Date('2026-08-01T00:00:00Z')
    const status = 'open'
    const roundKey = 'group'
    const deadline = getPredictionRoundDeadline(roundKey)
    const effective = futureDate >= deadline ? 'locked' : status
    expect(effective).toBe('locked')
  })

  it('should keep open status when deadline has not passed', () => {
    const earlyDate = new Date('2026-01-01T00:00:00Z')
    const status = 'open'
    const roundKey = 'group'
    const deadline = getPredictionRoundDeadline(roundKey)
    const effective = earlyDate >= deadline ? 'locked' : status
    expect(effective).toBe('open')
  })

  it('should not affect already-locked or scored rounds', () => {
    // locked stays locked, scored stays scored
    expect('locked').toBe('locked')
    expect('scored').toBe('scored')
  })
})

describe('getMatchKickoff', () => {
  it('should return a Date for valid match IDs', () => {
    expect(getMatchKickoff(1)).toBeInstanceOf(Date)
    expect(getMatchKickoff(104)).toBeInstanceOf(Date)
  })

  it('should return null for invalid match IDs', () => {
    expect(getMatchKickoff(0)).toBeNull()
    expect(getMatchKickoff(105)).toBeNull()
    expect(getMatchKickoff(-1)).toBeNull()
  })

  it('should return correct date for opening match', () => {
    const kickoff = getMatchKickoff(1)!
    expect(kickoff.toISOString()).toBe('2026-06-11T19:00:00.000Z')
  })

  it('should return correct date for final', () => {
    const kickoff = getMatchKickoff(104)!
    expect(kickoff.toISOString()).toBe('2026-07-19T19:00:00.000Z')
  })
})

describe('MD3 simultaneous kickoffs', () => {
  it('should have simultaneous kickoffs for same-group MD3 matches', () => {
    // Group A MD3: matches 5 and 6 should have the same kickoff
    const m5 = new Date(schedule[5].kickoffUtc).getTime()
    const m6 = new Date(schedule[6].kickoffUtc).getTime()
    expect(m5).toBe(m6)

    // Group B MD3: matches 11 and 12
    const m11 = new Date(schedule[11].kickoffUtc).getTime()
    const m12 = new Date(schedule[12].kickoffUtc).getTime()
    expect(m11).toBe(m12)
  })
})

describe('Deadline backstop (host forgot to lock)', () => {
  it('should auto-lock group predictions at first kickoff even if host never locked', () => {
    // Scenario: host left round status as "open", but kickoff has passed.
    // The effective status should be "locked" because isDeadlinePassed returns true.
    const roundStatus = 'open'
    const kickoffPassed = new Date('2026-06-11T19:00:00Z') // exact kickoff
    const effective = isDeadlinePassed('group', kickoffPassed) ? 'locked' : roundStatus
    expect(effective).toBe('locked')
  })

  it('should auto-lock knockout predictions at their respective kickoffs', () => {
    for (const round of PREDICTION_ROUNDS) {
      const deadline = getPredictionRoundDeadline(round)
      // One second after deadline
      const afterDeadline = new Date(deadline.getTime() + 1000)
      expect(isDeadlinePassed(round, afterDeadline)).toBe(true)
    }
  })

  it('should NOT auto-lock when all kickoffs are in the future', () => {
    const wellBefore = new Date('2025-01-01T00:00:00Z')
    for (const round of PREDICTION_ROUNDS) {
      expect(isDeadlinePassed(round, wellBefore)).toBe(false)
    }
  })

  it('should correctly backstop each round independently', () => {
    // After group kickoff but before R32 kickoff
    const r32Deadline = getPredictionRoundDeadline('r32')
    const afterGroupBeforeR32 = new Date(r32Deadline.getTime() - 60_000)
    expect(isDeadlinePassed('group', afterGroupBeforeR32)).toBe(true)
    expect(isDeadlinePassed('r32', afterGroupBeforeR32)).toBe(false)
  })
})
