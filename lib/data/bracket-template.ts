export interface BracketMatch {
  id: number
  round: 'R32' | 'R16' | 'QF' | 'SF' | '3RD' | 'F'
  homeSlot: string
  awaySlot: string
  homeTeamId: string | null
  awayTeamId: string | null
  winnerId: string | null
}

export const bracketTemplate: BracketMatch[] = [
  // R32 (matches 73-88)
  { id: 73, round: 'R32', homeSlot: '2A', awaySlot: '2B', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 74, round: 'R32', homeSlot: '1E', awaySlot: '3{A,B,C,D,F}', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 75, round: 'R32', homeSlot: '1F', awaySlot: '2C', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 76, round: 'R32', homeSlot: '1C', awaySlot: '2F', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 77, round: 'R32', homeSlot: '1I', awaySlot: '3{C,D,F,G,H}', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 78, round: 'R32', homeSlot: '2E', awaySlot: '2I', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 79, round: 'R32', homeSlot: '1A', awaySlot: '3{C,E,F,H,I}', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 80, round: 'R32', homeSlot: '1L', awaySlot: '3{E,H,I,J,K}', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 81, round: 'R32', homeSlot: '1D', awaySlot: '3{B,E,F,I,J}', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 82, round: 'R32', homeSlot: '1G', awaySlot: '3{A,E,H,I,J}', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 83, round: 'R32', homeSlot: '2K', awaySlot: '2L', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 84, round: 'R32', homeSlot: '1H', awaySlot: '2J', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 85, round: 'R32', homeSlot: '1B', awaySlot: '3{E,F,G,I,J}', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 86, round: 'R32', homeSlot: '1J', awaySlot: '2H', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 87, round: 'R32', homeSlot: '1K', awaySlot: '3{D,E,I,J,L}', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 88, round: 'R32', homeSlot: '2D', awaySlot: '2G', homeTeamId: null, awayTeamId: null, winnerId: null },

  // R16 (matches 89-96)
  { id: 89, round: 'R16', homeSlot: 'W74', awaySlot: 'W77', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 90, round: 'R16', homeSlot: 'W73', awaySlot: 'W75', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 91, round: 'R16', homeSlot: 'W76', awaySlot: 'W78', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 92, round: 'R16', homeSlot: 'W79', awaySlot: 'W80', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 93, round: 'R16', homeSlot: 'W83', awaySlot: 'W84', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 94, round: 'R16', homeSlot: 'W81', awaySlot: 'W82', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 95, round: 'R16', homeSlot: 'W86', awaySlot: 'W88', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 96, round: 'R16', homeSlot: 'W85', awaySlot: 'W87', homeTeamId: null, awayTeamId: null, winnerId: null },

  // QF (matches 97-100)
  { id: 97, round: 'QF', homeSlot: 'W89', awaySlot: 'W90', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 98, round: 'QF', homeSlot: 'W93', awaySlot: 'W94', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 99, round: 'QF', homeSlot: 'W91', awaySlot: 'W92', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 100, round: 'QF', homeSlot: 'W95', awaySlot: 'W96', homeTeamId: null, awayTeamId: null, winnerId: null },

  // SF (matches 101-102)
  { id: 101, round: 'SF', homeSlot: 'W97', awaySlot: 'W98', homeTeamId: null, awayTeamId: null, winnerId: null },
  { id: 102, round: 'SF', homeSlot: 'W99', awaySlot: 'W100', homeTeamId: null, awayTeamId: null, winnerId: null },

  // 3rd place (match 103)
  { id: 103, round: '3RD', homeSlot: 'L101', awaySlot: 'L102', homeTeamId: null, awayTeamId: null, winnerId: null },

  // Final (match 104)
  { id: 104, round: 'F', homeSlot: 'W101', awaySlot: 'W102', homeTeamId: null, awayTeamId: null, winnerId: null },
]
