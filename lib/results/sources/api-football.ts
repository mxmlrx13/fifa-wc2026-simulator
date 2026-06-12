/**
 * API-Football (api-sports.io) — primary source for match results.
 *
 * Endpoint: GET https://v3.football.api-sports.io/fixtures
 * Docs: https://www.api-football.com/documentation-v3
 * Free tier: 100 req/day (ample for 2×/day).
 *
 * We fetch finished World Cup 2026 fixtures (league=1, season=2026).
 */

export interface ApiFootballFixture {
  fixtureId: number
  date: string // ISO date
  status: string // FT, AET, PEN
  homeTeamName: string
  awayTeamName: string
  homeGoals: number
  awayGoals: number
  penaltyHome: number | null
  penaltyAway: number | null
  raw: unknown
}

interface ApiFootballResponse {
  response: Array<{
    fixture: {
      id: number
      date: string
      status: { short: string }
    }
    teams: {
      home: { id: number; name: string }
      away: { id: number; name: string }
    }
    goals: {
      home: number | null
      away: number | null
    }
    score: {
      penalty: {
        home: number | null
        away: number | null
      }
    }
  }>
}

const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN'])

/**
 * Fetch all finished World Cup 2026 fixtures from API-Football.
 * Returns parsed fixtures or null if the API is unavailable/unconfigured.
 */
export async function fetchApiFootball(): Promise<ApiFootballFixture[] | null> {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) {
    console.log('[api-football] API_FOOTBALL_KEY not set, skipping')
    return null
  }

  try {
    const url = 'https://v3.football.api-sports.io/fixtures?league=1&season=2026'
    const res = await fetch(url, {
      headers: { 'x-apisports-key': apiKey },
    })

    if (!res.ok) {
      console.error(`[api-football] HTTP ${res.status}: ${res.statusText}`)
      return null
    }

    const data: ApiFootballResponse = await res.json()

    if (!data.response || !Array.isArray(data.response)) {
      console.error('[api-football] Unexpected response shape')
      return null
    }

    return data.response
      .filter((f) => FINISHED_STATUSES.has(f.fixture.status.short))
      .filter((f) => f.goals.home !== null && f.goals.away !== null)
      .map((f) => ({
        fixtureId: f.fixture.id,
        date: f.fixture.date,
        status: f.fixture.status.short,
        homeTeamName: f.teams.home.name,
        awayTeamName: f.teams.away.name,
        homeGoals: f.goals.home!,
        awayGoals: f.goals.away!,
        penaltyHome: f.score.penalty.home,
        penaltyAway: f.score.penalty.away,
        raw: f,
      }))
  } catch (err) {
    console.error('[api-football] Fetch error:', err)
    return null
  }
}

/**
 * Determine the winner for a knockout fixture from API-Football data.
 * Returns the winning team name, or null if indeterminate.
 */
export function getApiFootballWinner(fixture: ApiFootballFixture): string | null {
  if (fixture.homeGoals > fixture.awayGoals) return fixture.homeTeamName
  if (fixture.awayGoals > fixture.homeGoals) return fixture.awayTeamName

  // Tied after regular/extra time — check penalties
  if (fixture.status === 'PEN') {
    if (fixture.penaltyHome !== null && fixture.penaltyAway !== null) {
      if (fixture.penaltyHome > fixture.penaltyAway) return fixture.homeTeamName
      if (fixture.penaltyAway > fixture.penaltyHome) return fixture.awayTeamName
    }
  }

  // AET with no goal difference and no penalty data — shouldn't happen for finished matches
  if (fixture.status === 'AET') {
    // AET means extra time was played and one team won in ET
    // goals already reflect ET result, so if still tied, data is incomplete
    return null
  }

  return null
}
