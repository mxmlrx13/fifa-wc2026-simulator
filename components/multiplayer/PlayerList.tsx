import { cn } from '@/lib/utils'

interface Player {
  id: string
  displayName: string
  isHost: boolean
}

interface PlayerListProps {
  players: Player[]
  currentPlayerId?: string
}

export default function PlayerList({ players, currentPlayerId }: PlayerListProps) {
  return (
    <div className="glass-card p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
        Players ({players.length})
      </h3>
      <div className="space-y-2">
        {players.map((p) => (
          <div
            key={p.id}
            className={cn(
              'flex items-center justify-between rounded-lg px-3 py-2',
              p.id === currentPlayerId && 'bg-accent/10',
            )}
          >
            <span className="text-sm font-medium">
              {p.displayName}
              {p.id === currentPlayerId && (
                <span className="ml-1.5 text-xs text-accent">(you)</span>
              )}
            </span>
            {p.isHost && (
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                HOST
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
