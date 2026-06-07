import { describe, it, expect } from 'vitest'
import { getHostNextAction } from '../host-actions'
import type { PredictionRoundKey } from '@/lib/constants'

type Status = 'pending' | 'open' | 'locked' | 'scored'

const ALL_KEYS: PredictionRoundKey[] = ['group', 'r32', 'r16', 'qf', 'sf', 'final']

/** Helper: build a full rounds array from a partial status map. Defaults to 'pending'. */
function makeRounds(statuses: Partial<Record<PredictionRoundKey, Status>>) {
  return ALL_KEYS.map((roundKey) => ({
    roundKey,
    status: statuses[roundKey] ?? ('pending' as Status),
  }))
}

describe('getHostNextAction', () => {
  // 1. All pending → open group (first round, no predecessor needed)
  it('returns open_round for group when all rounds are pending', () => {
    const result = getHostNextAction(makeRounds({}))
    expect(result).toEqual({
      type: 'open_round',
      roundKey: 'group',
      label: 'Open Group Stage predictions',
    })
  })

  // 2. Group open → lock group
  it('returns lock_round when group is open', () => {
    const result = getHostNextAction(makeRounds({ group: 'open' }))
    expect(result).toEqual({
      type: 'lock_round',
      roundKey: 'group',
      label: 'Lock Group Stage predictions',
    })
  })

  // 3. Group locked → enter group results
  it('returns enter_results when group is locked', () => {
    const result = getHostNextAction(makeRounds({ group: 'locked' }))
    expect(result).toEqual({
      type: 'enter_results',
      batch: 'group',
      label: 'Enter Group Stage results',
    })
  })

  // 4. Group scored, r32 pending → open r32
  it('returns open_round for r32 when group is scored and r32 is pending', () => {
    const result = getHostNextAction(makeRounds({ group: 'scored' }))
    expect(result).toEqual({
      type: 'open_round',
      roundKey: 'r32',
      label: 'Open Round of 32 predictions',
    })
  })

  // 5. Group scored, r32 open → lock r32
  it('returns lock_round for r32 when r32 is open', () => {
    const result = getHostNextAction(makeRounds({ group: 'scored', r32: 'open' }))
    expect(result).toEqual({
      type: 'lock_round',
      roundKey: 'r32',
      label: 'Lock Round of 32 predictions',
    })
  })

  // 6. Group scored, r32 locked → enter r32 results
  it('returns enter_results for r32 when r32 is locked', () => {
    const result = getHostNextAction(makeRounds({ group: 'scored', r32: 'locked' }))
    expect(result).toEqual({
      type: 'enter_results',
      batch: 'r32',
      label: 'Enter Round of 32 results',
    })
  })

  // 7. Group scored, r32 scored, r16 pending → open r16
  it('returns open_round for r16 when group and r32 are scored', () => {
    const result = getHostNextAction(makeRounds({ group: 'scored', r32: 'scored' }))
    expect(result).toEqual({
      type: 'open_round',
      roundKey: 'r16',
      label: 'Open Round of 16 predictions',
    })
  })

  // 8. All scored → finished
  it('returns finished when all rounds are scored', () => {
    const result = getHostNextAction(
      makeRounds({
        group: 'scored',
        r32: 'scored',
        r16: 'scored',
        qf: 'scored',
        sf: 'scored',
        final: 'scored',
      }),
    )
    expect(result).toEqual({
      type: 'finished',
      label: 'Tournament complete',
    })
  })

  // 9. sf scored, final pending → open final
  it('returns open_round for final when sf is scored and final is pending', () => {
    const result = getHostNextAction(
      makeRounds({
        group: 'scored',
        r32: 'scored',
        r16: 'scored',
        qf: 'scored',
        sf: 'scored',
        final: 'pending',
      }),
    )
    expect(result).toEqual({
      type: 'open_round',
      roundKey: 'final',
      label: 'Open Final predictions',
    })
  })

  // 10. Full tournament lifecycle
  it('transitions through the entire tournament lifecycle', () => {
    // Start: all pending → open group
    let rounds = makeRounds({})
    expect(getHostNextAction(rounds).type).toBe('open_round')
    expect(getHostNextAction(rounds)).toHaveProperty('roundKey', 'group')

    // Group open → lock group
    rounds = makeRounds({ group: 'open' })
    expect(getHostNextAction(rounds).type).toBe('lock_round')

    // Group locked → enter results
    rounds = makeRounds({ group: 'locked' })
    expect(getHostNextAction(rounds).type).toBe('enter_results')

    // Group scored → open r32
    rounds = makeRounds({ group: 'scored' })
    expect(getHostNextAction(rounds)).toMatchObject({ type: 'open_round', roundKey: 'r32' })

    // r32 open → lock r32
    rounds = makeRounds({ group: 'scored', r32: 'open' })
    expect(getHostNextAction(rounds)).toMatchObject({ type: 'lock_round', roundKey: 'r32' })

    // r32 locked → enter results
    rounds = makeRounds({ group: 'scored', r32: 'locked' })
    expect(getHostNextAction(rounds)).toMatchObject({ type: 'enter_results', batch: 'r32' })

    // r32 scored → open r16
    rounds = makeRounds({ group: 'scored', r32: 'scored' })
    expect(getHostNextAction(rounds)).toMatchObject({ type: 'open_round', roundKey: 'r16' })

    // Continue through qf, sf, final...
    rounds = makeRounds({ group: 'scored', r32: 'scored', r16: 'scored' })
    expect(getHostNextAction(rounds)).toMatchObject({ type: 'open_round', roundKey: 'qf' })

    rounds = makeRounds({ group: 'scored', r32: 'scored', r16: 'scored', qf: 'scored' })
    expect(getHostNextAction(rounds)).toMatchObject({ type: 'open_round', roundKey: 'sf' })

    rounds = makeRounds({
      group: 'scored',
      r32: 'scored',
      r16: 'scored',
      qf: 'scored',
      sf: 'scored',
    })
    expect(getHostNextAction(rounds)).toMatchObject({ type: 'open_round', roundKey: 'final' })

    // Final scored → finished
    rounds = makeRounds({
      group: 'scored',
      r32: 'scored',
      r16: 'scored',
      qf: 'scored',
      sf: 'scored',
      final: 'scored',
    })
    expect(getHostNextAction(rounds).type).toBe('finished')
  })

  // Edge: locking prioritizes the earliest open round
  it('prioritizes the earliest open round when multiple are open', () => {
    const result = getHostNextAction(
      makeRounds({ group: 'scored', r32: 'open', r16: 'open' }),
    )
    expect(result).toMatchObject({ type: 'lock_round', roundKey: 'r32' })
  })

  // Edge: locked prioritizes the earliest locked round
  it('prioritizes the earliest locked round when multiple are locked', () => {
    const result = getHostNextAction(
      makeRounds({ group: 'scored', r32: 'locked', r16: 'locked' }),
    )
    expect(result).toMatchObject({ type: 'enter_results', batch: 'r32' })
  })

  // Edge: does not skip ahead — pending round without scored predecessor stays pending
  it('does not open a round whose predecessor is not scored', () => {
    // group pending, r32 pending — only group should be openable
    const result = getHostNextAction(makeRounds({}))
    expect(result).toMatchObject({ type: 'open_round', roundKey: 'group' })
  })

  // Knockout labels
  it('uses correct labels for knockout rounds', () => {
    const qfResult = getHostNextAction(
      makeRounds({ group: 'scored', r32: 'scored', r16: 'scored', qf: 'open' }),
    )
    expect(qfResult).toHaveProperty('label', 'Lock Quarter-finals predictions')

    const sfResult = getHostNextAction(
      makeRounds({ group: 'scored', r32: 'scored', r16: 'scored', qf: 'scored', sf: 'locked' }),
    )
    expect(sfResult).toHaveProperty('label', 'Enter Semi-finals results')

    const finalResult = getHostNextAction(
      makeRounds({
        group: 'scored',
        r32: 'scored',
        r16: 'scored',
        qf: 'scored',
        sf: 'scored',
        final: 'pending',
      }),
    )
    expect(finalResult).toHaveProperty('label', 'Open Final predictions')
  })
})
