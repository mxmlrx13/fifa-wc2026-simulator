import { createClient } from './client'

/**
 * Ensure anonymous session exists. Returns the user's auth ID.
 * Works for both anonymous and email-authenticated sessions.
 */
export async function ensureAnonymousSession(): Promise<string> {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()

  // Return existing session (anonymous or email-linked)
  if (session?.user) {
    return session.user.id
  }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) {
    throw new Error('Failed to create anonymous session')
  }

  return data.user.id
}

/**
 * Link an email to the current anonymous session.
 * Preserves the same user.id, so all player data stays valid.
 */
export async function linkEmail(email: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ email })
  return { error }
}

/**
 * Sign in with a magic link for returning users on a new device.
 */
export async function signInWithEmail(email: string) {
  const supabase = createClient()
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : undefined

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })
  return { error }
}

/**
 * Get the current authenticated user, or null.
 */
export async function getAuthUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
