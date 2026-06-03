import { GroupId } from '../types'

export interface ThirdPlaceSlot {
  matchId: number
  opponentSlot: string  // e.g. "1E"
  allowedGroups: GroupId[]
}

export const thirdPlaceSlots: ThirdPlaceSlot[] = [
  { matchId: 74, opponentSlot: '1E', allowedGroups: ['A', 'B', 'C', 'D', 'F'] },
  { matchId: 77, opponentSlot: '1I', allowedGroups: ['C', 'D', 'F', 'G', 'H'] },
  { matchId: 79, opponentSlot: '1A', allowedGroups: ['C', 'E', 'F', 'H', 'I'] },
  { matchId: 80, opponentSlot: '1L', allowedGroups: ['E', 'H', 'I', 'J', 'K'] },
  { matchId: 81, opponentSlot: '1D', allowedGroups: ['B', 'E', 'F', 'I', 'J'] },
  { matchId: 82, opponentSlot: '1G', allowedGroups: ['A', 'E', 'H', 'I', 'J'] },
  { matchId: 85, opponentSlot: '1B', allowedGroups: ['E', 'F', 'G', 'I', 'J'] },
  { matchId: 87, opponentSlot: '1K', allowedGroups: ['D', 'E', 'I', 'J', 'L'] },
]
