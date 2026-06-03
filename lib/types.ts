export type GroupId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L'

export interface Team {
  id: string        // ISO 3166-1 alpha-3 code
  name: string
  fifaRanking: number
  confederation: 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC'
  flagCode: string  // lowercase ISO 3166-1 alpha-2 for flag display
}

export interface GroupMatch {
  id: number         // Match number (1-72)
  groupId: GroupId
  matchday: 1 | 2 | 3
  homeTeamId: string
  awayTeamId: string
  homeScore: number | null
  awayScore: number | null
}

export interface GroupStanding {
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  position: number
  qualification: 'winner' | 'runner-up' | 'third' | 'eliminated'
}

export interface KnockoutMatch {
  id: number           // Match number (73-104)
  round: 'R32' | 'R16' | 'QF' | 'SF' | '3RD' | 'F'
  homeSlot: string     // e.g. "1A", "2B", "3{A,B,C,D,F}", "W73"
  awaySlot: string
  homeTeamId: string | null
  awayTeamId: string | null
  winnerId: string | null
}

export interface ThirdPlaceResult {
  teamId: string
  groupId: GroupId
  standing: GroupStanding
  qualified: boolean
  matchSlot: number | null  // Which R32 match they're assigned to
}

export interface TournamentState {
  groupMatches: GroupMatch[]
  knockoutMatches: KnockoutMatch[]
  knockoutPicks: Record<number, string>  // matchId -> winnerId
}
