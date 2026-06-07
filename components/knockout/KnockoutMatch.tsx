'use client'

import type { KnockoutMatch as KnockoutMatchType } from '@/lib/types'
import { useTournament } from '@/lib/store'
import { teamsMap } from '@/lib/data/teams'
import { cn } from '@/lib/utils'

interface KnockoutMatchProps {
  match: KnockoutMatchType
}

function flagEmoji(flagCode: string): string {
  if (flagCode === 'gb-eng') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'
  if (flagCode === 'gb-sct') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'
  if (flagCode === 'gb-wls') return '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}'
  const code = flagCode.toUpperCase()
  return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + 0x1F1A5))
}

function slotLabel(slot: string): string {
  if (slot.startsWith('W')) return `Winner M${slot.slice(1)}`
  if (slot.startsWith('L')) return `Loser M${slot.slice(1)}`
  if (slot.startsWith('3{')) return `3rd ${slot.slice(1)}`
  if (slot.startsWith('1')) return `1st Gr.${slot.slice(1)}`
  if (slot.startsWith('2')) return `2nd Gr.${slot.slice(1)}`
  return slot
}

function TeamRow({
  teamId,
  slot,
  isWinner,
  isLoser,
  canPick,
  onClick,
  position,
}: {
  teamId: string | null
  slot: string
  isWinner: boolean
  isLoser: boolean
  canPick: boolean
  onClick: () => void
  position: 'top' | 'bottom'
}) {
  const team = teamId ? teamsMap[teamId] : null

  return (
    <button
      type="button"
      disabled={!canPick}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left transition-all',
        position === 'top' && 'border-b border-line',
        canPick && 'cursor-pointer hover:bg-paper',
        !canPick && 'cursor-default',
        isWinner && 'bg-red-soft border-l-[1.5px] border-l-red',
        isLoser && 'opacity-50',
        !isWinner && !isLoser && 'border-l-[1.5px] border-l-transparent'
      )}
    >
      {team ? (
        <>
          <span className="text-base leading-none">{flagEmoji(team.flagCode)}</span>
          <span className="text-xs font-bold">{team.id}</span>
          {isWinner && <span className="ml-auto text-xs text-red">{'\u2713'}</span>}
        </>
      ) : (
        <span className="text-[10px] italic text-muted">{slotLabel(slot)}</span>
      )}
    </button>
  )
}

export default function KnockoutMatchCard({ match }: KnockoutMatchProps) {
  const { dispatch } = useTournament()

  const canPick = match.homeTeamId !== null && match.awayTeamId !== null
  const homeIsWinner = match.winnerId !== null && match.winnerId === match.homeTeamId
  const awayIsWinner = match.winnerId !== null && match.winnerId === match.awayTeamId

  function pickWinner(teamId: string) {
    if (!canPick) return
    dispatch({ type: 'SET_KNOCKOUT_WINNER', matchId: match.id, winnerId: teamId })
  }

  return (
    <div className={cn(
      'w-52 rounded-[var(--radius-card)] border border-line bg-card overflow-hidden transition-all',
      match.winnerId && 'border-red-line'
    )}>
      {/* Match header */}
      <div className="border-b border-line bg-paper px-2 py-1 text-center text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
        M{match.id}
      </div>

      <TeamRow
        teamId={match.homeTeamId}
        slot={match.homeSlot}
        isWinner={homeIsWinner}
        isLoser={awayIsWinner}
        canPick={canPick}
        onClick={() => match.homeTeamId && pickWinner(match.homeTeamId)}
        position="top"
      />
      <TeamRow
        teamId={match.awayTeamId}
        slot={match.awaySlot}
        isWinner={awayIsWinner}
        isLoser={homeIsWinner}
        canPick={canPick}
        onClick={() => match.awayTeamId && pickWinner(match.awayTeamId)}
        position="bottom"
      />
    </div>
  )
}
