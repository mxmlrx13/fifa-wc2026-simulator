/**
 * ESPN — free primary source for World Cup match results.
 *
 * Endpoint: https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard
 * No API key needed. Supports ?dates=YYYYMMDD for historical dates.
 *
 * We fetch the tournament date range and return all finished fixtures.
 */

import type { ApiFootballFixture } from './api-football'

interface EspnCompetitor {
  id: string
  homeAway: 'home' | 'away'
  team: { shortDisplayName: string; displayName: string }
  score: string
  winner?: boolean
}

interface EspnEvent {
  id: string
  date: string
  competitions: Array<{
    competitors: EspnCompetitor[]
    status: {
      type: { name: string; completed: boolean }
    }
  }>
}

interface EspnScoreboard {
  events: EspnEvent[]
}

const BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'

// World Cup 2026: June 11 – July 19 (group stage through final)
const TOURNAMENT_START = '20260611'
const TOURNAMENT_END = '20260719'

/**
 * Generate YYYYMMDD strings for each day in a range.
 */
function dateRange(startYmd: string, endYmd: string): string[] {
  const dates: string[] = []
  const start = new Date(`${startYmd.slice(0, 4)}-${startYmd.slice(4, 6)}-${startYmd.slice(6, 8)}`)
  const end = new Date(`${endYmd.slice(0, 4)}-${endYmd.slice(4, 6)}-${endYmd.slice(6, 8)}`)
  const today = new Date()
  today.setHours(23, 59, 59) // include today

  for (let d = new Date(start); d <= end && d <= today; d.setDate(d.getDate() + 1)) {
    const ymd = d.toISOString().slice(0, 10).replace(/-/g, '')
    dates.push(ymd)
  }
  return dates
}

/**
 * Fetch all finished World Cup 2026 fixtures from ESPN.
 * Returns fixtures in the same shape as ApiFootballFixture for compatibility.
 */
export async function fetchEspn(): Promise<ApiFootballFixture[] | null> {
  try {
    const dates = dateRange(TOURNAMENT_START, TOURNAMENT_END)
    const fixtures: ApiFootballFixture[] = []

    // Fetch each day (ESPN returns per-date scoreboards)
    // Batch in parallel, max ~18 days so far in the tournament
    const responses = await Promise.all(
      dates.map(async (ymd) => {
        const res = await fetch(`${BASE_URL}?dates=${ymd}`)
        if (!res.ok) return null
        const data: EspnScoreboard = await res.json()
        return data.events ?? []
      }),
    )

    for (const events of responses) {
      if (!events) continue
      for (const event of events) {
        const comp = event.competitions?.[0]
        if (!comp) continue
        if (!comp.status?.type?.completed) continue

        const home = comp.competitors.find((c) => c.homeAway === 'home')
        const away = comp.competitors.find((c) => c.homeAway === 'away')
        if (!home || !away) continue

        const homeGoals = parseInt(home.score, 10)
        const awayGoals = parseInt(away.score, 10)
        if (isNaN(homeGoals) || isNaN(awayGoals)) continue

        // Determine penalty winner from ESPN's `winner` boolean.
        // For penalty-decided matches, scores are tied but one competitor
        // has winner: true. We synthesise penaltyHome/penaltyAway as 1/0
        // so getApiFootballWinner() can pick the correct team.
        let penaltyHome: number | null = null
        let penaltyAway: number | null = null
        if (homeGoals === awayGoals && (home.winner || away.winner)) {
          penaltyHome = home.winner ? 1 : 0
          penaltyAway = away.winner ? 1 : 0
        }

        fixtures.push({
          fixtureId: parseInt(event.id, 10) || 0,
          date: event.date,
          status: penaltyHome !== null ? 'PEN' : 'FT',
          homeTeamName: home.team.displayName,
          awayTeamName: away.team.displayName,
          homeGoals,
          awayGoals,
          penaltyHome,
          penaltyAway,
          raw: event,
        })
      }
    }

    console.log(`[espn] Fetched ${fixtures.length} finished fixtures across ${dates.length} days`)
    return fixtures
  } catch (err) {
    console.error('[espn] Fetch error:', err)
    return null
  }
}
