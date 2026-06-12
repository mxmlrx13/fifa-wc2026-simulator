/**
 * Netlify Scheduled Function — runs twice daily (07:00 + 21:00 UTC).
 *
 * For each game with auto_results_enabled, fetches finished match results
 * from two independent sources, cross-checks them, and either auto-applies
 * (when sources agree) or flags for host review.
 */

import { createClient } from '@supabase/supabase-js'
import { runAutoResults } from '../../lib/results/auto-results.js'

export default async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[auto-results] Missing SUPABASE env vars')
    return new Response('Configuration error', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  console.log('[auto-results] Starting scheduled run...')
  const log = await runAutoResults(supabase)

  console.log('[auto-results] Complete:', JSON.stringify(log))

  return new Response(JSON.stringify(log), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = {
  schedule: '0 7,21 * * *',
}
