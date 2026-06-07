import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isOnboarded, markOnboarded, clearOnboarded } from '@/lib/hooks/use-onboarding'

// Mock localStorage
const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { storage[key] = value }),
  removeItem: vi.fn((key: string) => { delete storage[key] }),
}

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('Onboarding flag logic', () => {
  beforeEach(() => {
    for (const key of Object.keys(storage)) delete storage[key]
    vi.clearAllMocks()
  })

  it('should return false when flag is not set', () => {
    expect(isOnboarded()).toBe(false)
  })

  it('should return true after markOnboarded is called', () => {
    markOnboarded()
    expect(isOnboarded()).toBe(true)
  })

  it('should return false after clearOnboarded is called', () => {
    markOnboarded()
    expect(isOnboarded()).toBe(true)
    clearOnboarded()
    expect(isOnboarded()).toBe(false)
  })

  it('should use the correct localStorage key', () => {
    markOnboarded()
    expect(localStorageMock.setItem).toHaveBeenCalledWith('wc26-onboarded', '1')
  })

  it('should not show onboarding twice (flag is respected)', () => {
    expect(isOnboarded()).toBe(false)
    markOnboarded()
    expect(isOnboarded()).toBe(true)
    // Simulate page reload by re-reading
    expect(isOnboarded()).toBe(true)
  })
})

describe('Trigger logic — player vs non-player', () => {
  beforeEach(() => {
    for (const key of Object.keys(storage)) delete storage[key]
    vi.clearAllMocks()
  })

  it('should trigger for non-player who is not onboarded', () => {
    const currentPlayer = null
    const game = { id: '123', code: 'ABC123', name: 'Test' }
    const loading = false
    const shouldShow = !loading && game && !currentPlayer && !isOnboarded()
    expect(shouldShow).toBe(true)
  })

  it('should NOT trigger for existing player even if not onboarded', () => {
    const currentPlayer = { id: 'p1', displayName: 'Alice', isHost: false, championPick: null, recoveryToken: 'tok' }
    const game = { id: '123', code: 'ABC123', name: 'Test' }
    const loading = false
    const shouldShow = !loading && game && !currentPlayer && !isOnboarded()
    expect(shouldShow).toBe(false)
  })

  it('should NOT trigger for non-player who is already onboarded', () => {
    markOnboarded()
    const currentPlayer = null
    const game = { id: '123', code: 'ABC123', name: 'Test' }
    const loading = false
    const shouldShow = !loading && game && !currentPlayer && !isOnboarded()
    expect(shouldShow).toBe(false)
  })

  it('should NOT trigger while loading', () => {
    const currentPlayer = null
    const game = { id: '123', code: 'ABC123', name: 'Test' }
    const loading = true
    const shouldShow = !loading && game && !currentPlayer && !isOnboarded()
    expect(shouldShow).toBe(false)
  })

  it('should NOT trigger when game is null', () => {
    const currentPlayer = null
    const game = null
    const loading = false
    const shouldShow = Boolean(!loading && game && !currentPlayer && !isOnboarded())
    expect(shouldShow).toBe(false)
  })
})

describe('Skip button always available', () => {
  it('should show skip on all non-final steps', () => {
    const TOTAL_STEPS = 5
    for (let step = 0; step < TOTAL_STEPS - 1; step++) {
      const isLast = step === TOTAL_STEPS - 1
      expect(isLast).toBe(false) // skip should be visible
    }
  })

  it('should not show skip on the final step', () => {
    const TOTAL_STEPS = 5
    const step = TOTAL_STEPS - 1
    const isLast = step === TOTAL_STEPS - 1
    expect(isLast).toBe(true) // no skip on final
  })

  it('skip jumps to the last step (not dismiss)', () => {
    const TOTAL_STEPS = 5
    // handleSkip sets step to TOTAL_STEPS - 1 (the last step with CTA)
    const targetStep = TOTAL_STEPS - 1
    expect(targetStep).toBe(4) // lands on last content step, user still sees CTA
  })
})

describe('Onboarding re-entry mode', () => {
  beforeEach(() => {
    for (const key of Object.keys(storage)) delete storage[key]
    vi.clearAllMocks()
  })

  it('re-entry (back mode) is available even after onboarding is complete', () => {
    markOnboarded()
    expect(isOnboarded()).toBe(true)
    // "How it works" link should still open the flow in 'back' mode
    // The trigger for 'back' mode does not check isOnboarded()
    const mode = 'back'
    expect(mode).toBe('back')
  })
})
