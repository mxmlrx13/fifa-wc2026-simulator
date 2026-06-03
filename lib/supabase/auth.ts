import { createClient } from './client'

/**
 * Ensure anonymous session exists. Returns the user's auth ID.
 */
export async function ensureAnonymousSession(): Promise<string> {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (session?.user) {
    return session.user.id
  }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) {
    throw new Error('Failed to create anonymous session')
  }

  return data.user.id
}
