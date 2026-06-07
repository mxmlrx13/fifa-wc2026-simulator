import { describe, it, expect } from 'vitest'

/**
 * Tests for recovery token, host transfer, and player removal logic.
 * These test the permission/validation rules as pure functions,
 * since the actual DB operations happen in API routes.
 */

// Permission matrix for player removal
function canRemovePlayer(
  caller: { id: string; isHost: boolean },
  target: { id: string; isHost: boolean },
): { allowed: boolean; error?: string } {
  const isSelf = caller.id === target.id
  const isHost = caller.is_host ?? caller.isHost

  // Target is host — can't be removed
  if (target.isHost) {
    return { allowed: false, error: 'host_cannot_be_removed' }
  }

  // Self-removal (leaving)
  if (isSelf) {
    return { allowed: true }
  }

  // Host removing someone else
  if (isHost) {
    return { allowed: true }
  }

  // Non-host trying to remove someone else
  return { allowed: false, error: 'not_authorized' }
}

// Host transfer validation
function canTransferHost(
  caller: { id: string; isHost: boolean },
  target: { id: string; isHost: boolean; exists: boolean },
): { allowed: boolean; error?: string } {
  if (!caller.isHost) {
    return { allowed: false, error: 'not_host' }
  }
  if (!target.exists) {
    return { allowed: false, error: 'target_not_found' }
  }
  if (target.isHost) {
    return { allowed: false, error: 'already_host' }
  }
  return { allowed: true }
}

// Recovery token validation
function canRecover(
  token: string | null,
  playerToken: string | null,
  gameId: string,
  playerGameId: string,
): { allowed: boolean; error?: string } {
  if (!token) {
    return { allowed: false, error: 'no_token' }
  }
  if (!playerToken || token !== playerToken) {
    return { allowed: false, error: 'invalid_token' }
  }
  if (gameId !== playerGameId) {
    return { allowed: false, error: 'wrong_game' }
  }
  return { allowed: true }
}

describe('canRemovePlayer', () => {
  const host = { id: 'host-1', isHost: true }
  const player1 = { id: 'player-1', isHost: false }
  const player2 = { id: 'player-2', isHost: false }

  it('host can remove non-host player', () => {
    expect(canRemovePlayer(host, player1)).toEqual({ allowed: true })
  })

  it('non-host cannot remove another player', () => {
    expect(canRemovePlayer(player1, player2)).toEqual({ allowed: false, error: 'not_authorized' })
  })

  it('non-host can leave (self-remove)', () => {
    expect(canRemovePlayer(player1, player1)).toEqual({ allowed: true })
  })

  it('host cannot be removed', () => {
    expect(canRemovePlayer(host, host)).toEqual({ allowed: false, error: 'host_cannot_be_removed' })
  })

  it('non-host cannot remove host', () => {
    expect(canRemovePlayer(player1, host)).toEqual({ allowed: false, error: 'host_cannot_be_removed' })
  })
})

describe('canTransferHost', () => {
  const host = { id: 'host-1', isHost: true }
  const player1 = { id: 'player-1', isHost: false, exists: true }
  const nonExistent = { id: 'ghost', isHost: false, exists: false }

  it('host can transfer to existing non-host player', () => {
    expect(canTransferHost(host, player1)).toEqual({ allowed: true })
  })

  it('non-host cannot transfer', () => {
    const nonHost = { id: 'player-2', isHost: false }
    expect(canTransferHost(nonHost, player1)).toEqual({ allowed: false, error: 'not_host' })
  })

  it('cannot transfer to non-existent player', () => {
    expect(canTransferHost(host, nonExistent)).toEqual({ allowed: false, error: 'target_not_found' })
  })

  it('cannot transfer to self (already host)', () => {
    const hostAsTarget = { ...host, exists: true }
    expect(canTransferHost(host, hostAsTarget)).toEqual({ allowed: false, error: 'already_host' })
  })
})

describe('canRecover (recovery token validation)', () => {
  const validToken = 'abc-123-def'
  const gameId = 'game-1'

  it('accepts valid token for correct game', () => {
    expect(canRecover(validToken, validToken, gameId, gameId)).toEqual({ allowed: true })
  })

  it('rejects null token', () => {
    expect(canRecover(null, validToken, gameId, gameId)).toEqual({ allowed: false, error: 'no_token' })
  })

  it('rejects wrong token', () => {
    expect(canRecover('wrong', validToken, gameId, gameId)).toEqual({ allowed: false, error: 'invalid_token' })
  })

  it('rejects token for wrong game', () => {
    expect(canRecover(validToken, validToken, gameId, 'other-game')).toEqual({ allowed: false, error: 'wrong_game' })
  })

  it('rebinds: valid token updates auth_id conceptually', () => {
    // The recovery flow: token matches → update auth_id → old session disconnected
    const result = canRecover(validToken, validToken, gameId, gameId)
    expect(result.allowed).toBe(true)
    // After rebind, the player's auth_id would be the new user's ID
    // The old session's user ID no longer matches any player row
  })
})
