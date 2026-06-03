import { Team } from '../types'

export const teams: Team[] = [
  // Group A
  { id: 'MEX', name: 'Mexico', fifaRanking: 15, confederation: 'CONCACAF', flagCode: 'mx' },
  { id: 'ZAF', name: 'South Africa', fifaRanking: 59, confederation: 'CAF', flagCode: 'za' },
  { id: 'KOR', name: 'Korea Republic', fifaRanking: 22, confederation: 'AFC', flagCode: 'kr' },
  { id: 'CZE', name: 'Czechia', fifaRanking: 36, confederation: 'UEFA', flagCode: 'cz' },

  // Group B
  { id: 'CAN', name: 'Canada', fifaRanking: 33, confederation: 'CONCACAF', flagCode: 'ca' },
  { id: 'CHE', name: 'Switzerland', fifaRanking: 19, confederation: 'UEFA', flagCode: 'ch' },
  { id: 'QAT', name: 'Qatar', fifaRanking: 45, confederation: 'AFC', flagCode: 'qa' },
  { id: 'BIH', name: 'Bosnia and Herzegovina', fifaRanking: 57, confederation: 'UEFA', flagCode: 'ba' },

  // Group C
  { id: 'BRA', name: 'Brazil', fifaRanking: 5, confederation: 'CONMEBOL', flagCode: 'br' },
  { id: 'MAR', name: 'Morocco', fifaRanking: 13, confederation: 'CAF', flagCode: 'ma' },
  { id: 'HTI', name: 'Haiti', fifaRanking: 87, confederation: 'CONCACAF', flagCode: 'ht' },
  { id: 'SCO', name: 'Scotland', fifaRanking: 39, confederation: 'UEFA', flagCode: 'gb-sct' },

  // Group D
  { id: 'USA', name: 'United States', fifaRanking: 11, confederation: 'CONCACAF', flagCode: 'us' },
  { id: 'PRY', name: 'Paraguay', fifaRanking: 52, confederation: 'CONMEBOL', flagCode: 'py' },
  { id: 'AUS', name: 'Australia', fifaRanking: 24, confederation: 'AFC', flagCode: 'au' },
  { id: 'TUR', name: 'Türkiye', fifaRanking: 26, confederation: 'UEFA', flagCode: 'tr' },

  // Group E
  { id: 'DEU', name: 'Germany', fifaRanking: 3, confederation: 'UEFA', flagCode: 'de' },
  { id: 'CUW', name: 'Curaçao', fifaRanking: 93, confederation: 'CONCACAF', flagCode: 'cw' },
  { id: 'CIV', name: "Côte d'Ivoire", fifaRanking: 38, confederation: 'CAF', flagCode: 'ci' },
  { id: 'ECU', name: 'Ecuador', fifaRanking: 30, confederation: 'CONMEBOL', flagCode: 'ec' },

  // Group F
  { id: 'NLD', name: 'Netherlands', fifaRanking: 7, confederation: 'UEFA', flagCode: 'nl' },
  { id: 'JPN', name: 'Japan', fifaRanking: 14, confederation: 'AFC', flagCode: 'jp' },
  { id: 'TUN', name: 'Tunisia', fifaRanking: 40, confederation: 'CAF', flagCode: 'tn' },
  { id: 'SWE', name: 'Sweden', fifaRanking: 42, confederation: 'UEFA', flagCode: 'se' },

  // Group G
  { id: 'BEL', name: 'Belgium', fifaRanking: 6, confederation: 'UEFA', flagCode: 'be' },
  { id: 'EGY', name: 'Egypt', fifaRanking: 37, confederation: 'CAF', flagCode: 'eg' },
  { id: 'IRN', name: 'Iran', fifaRanking: 20, confederation: 'AFC', flagCode: 'ir' },
  { id: 'NZL', name: 'New Zealand', fifaRanking: 95, confederation: 'OFC', flagCode: 'nz' },

  // Group H
  { id: 'ESP', name: 'Spain', fifaRanking: 1, confederation: 'UEFA', flagCode: 'es' },
  { id: 'CPV', name: 'Cabo Verde', fifaRanking: 72, confederation: 'CAF', flagCode: 'cv' },
  { id: 'SAU', name: 'Saudi Arabia', fifaRanking: 56, confederation: 'AFC', flagCode: 'sa' },
  { id: 'URY', name: 'Uruguay', fifaRanking: 9, confederation: 'CONMEBOL', flagCode: 'uy' },

  // Group I
  { id: 'FRA', name: 'France', fifaRanking: 2, confederation: 'UEFA', flagCode: 'fr' },
  { id: 'SEN', name: 'Senegal', fifaRanking: 17, confederation: 'CAF', flagCode: 'sn' },
  { id: 'NOR', name: 'Norway', fifaRanking: 44, confederation: 'UEFA', flagCode: 'no' },
  { id: 'IRQ', name: 'Iraq', fifaRanking: 63, confederation: 'AFC', flagCode: 'iq' },

  // Group J
  { id: 'ARG', name: 'Argentina', fifaRanking: 4, confederation: 'CONMEBOL', flagCode: 'ar' },
  { id: 'DZA', name: 'Algeria', fifaRanking: 35, confederation: 'CAF', flagCode: 'dz' },
  { id: 'AUT', name: 'Austria', fifaRanking: 25, confederation: 'UEFA', flagCode: 'at' },
  { id: 'JOR', name: 'Jordan', fifaRanking: 68, confederation: 'AFC', flagCode: 'jo' },

  // Group K
  { id: 'PRT', name: 'Portugal', fifaRanking: 8, confederation: 'UEFA', flagCode: 'pt' },
  { id: 'UZB', name: 'Uzbekistan', fifaRanking: 62, confederation: 'AFC', flagCode: 'uz' },
  { id: 'COL', name: 'Colombia', fifaRanking: 12, confederation: 'CONMEBOL', flagCode: 'co' },
  { id: 'COD', name: 'Congo DR', fifaRanking: 55, confederation: 'CAF', flagCode: 'cd' },

  // Group L
  { id: 'ENG', name: 'England', fifaRanking: 10, confederation: 'UEFA', flagCode: 'gb-eng' },
  { id: 'HRV', name: 'Croatia', fifaRanking: 16, confederation: 'UEFA', flagCode: 'hr' },
  { id: 'GHA', name: 'Ghana', fifaRanking: 48, confederation: 'CAF', flagCode: 'gh' },
  { id: 'PAN', name: 'Panama', fifaRanking: 46, confederation: 'CONCACAF', flagCode: 'pa' },
]

export const teamsMap: Record<string, Team> = Object.fromEntries(
  teams.map((t) => [t.id, t])
)
