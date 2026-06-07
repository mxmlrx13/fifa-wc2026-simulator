'use client'

import { ensureAnonymousSession } from './auth'

/**
 * Fetch wrapper for /api/games/* calls with 401 resilience.
 * On 401, ensures an anonymous session exists and retries once.
 */
export async function gameFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init)

  if (res.status !== 401) return res

  // Try to restore the session and retry
  try {
    await ensureAnonymousSession()
  } catch {
    return res // can't recover
  }

  return fetch(input, init)
}
