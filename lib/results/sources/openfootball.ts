/**
 * openfootball/worldcup.json — keyless public JSON cross-check source.
 *
 * Used ONLY to confirm primary source scores. Never used alone for auto-apply.
 * If unavailable, all matches are flagged as 'single_source' for host review.
 */

export interface OpenFootballMatch {
  homeTeamName: string
  awayTeamName: string
  homeScore: number | null
  awayScore: number | null
  date: string // YYYY-MM-DD
  raw: unknown
}

interface OpenFootballResponse {
  rounds: Array<{
    name: string
    matches: Array<{
      num?: number
      date: string
      team1: { name: string; code?: string }
      team2: { name: string; code?: string }
      score1?: number | null
      score2?: number | null
      score1i?: number | null // half-time
      score2i?: number | null
    }>
  }>
}

const OPENFOOTBALL_URL =
  process.env.OPENFOOTBALL_URL ??
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

/**
 * Fetch all World Cup 2026 match results from openfootball.
 * Returns parsed matches with scores, or null if unavailable.
 */
export async function fetchOpenFootball(): Promise<OpenFootballMatch[] | null> {
  try {
    const res = await fetch(OPENFOOTBALL_URL)

    if (!res.ok) {
      console.log(`[openfootball] HTTP ${res.status} — source unavailable`)
      return null
    }

    const data: OpenFootballResponse = await res.json()

    if (!data.rounds || !Array.isArray(data.rounds)) {
      console.error('[openfootball] Unexpected response shape')
      return null
    }

    const matches: OpenFootballMatch[] = []

    for (const round of data.rounds) {
      for (const m of round.matches) {
        // Only include matches with actual scores
        if (m.score1 == null || m.score2 == null) continue

        matches.push({
          homeTeamName: m.team1.code ?? m.team1.name,
          awayTeamName: m.team2.code ?? m.team2.name,
          homeScore: m.score1,
          awayScore: m.score2,
          date: m.date,
          raw: m,
        })
      }
    }

    return matches
  } catch (err) {
    console.error('[openfootball] Fetch error:', err)
    return null
  }
}
