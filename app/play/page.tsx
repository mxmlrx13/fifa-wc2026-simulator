'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useGameRegistry, removeGame, type GameRegistryEntry } from '@/lib/hooks/use-game-registry'
import { gameFetch } from '@/lib/supabase/game-fetch'
import Badge from '@/components/ui/Badge'

interface GameCardData extends GameRegistryEntry {
  playerCount?: number
  statusLine?: string
  badgeVariant?: 'open' | 'live' | 'locked' | 'neutral'
  badgeLabel?: string
  notFound?: boolean
}

function deriveStatus(data: {
  rounds?: Array<{ roundKey: string; status: string }>
  isHost?: boolean
}): { statusLine: string; badgeVariant?: 'open' | 'live' | 'locked' | 'neutral'; badgeLabel?: string } {
  const rounds = data.rounds ?? []
  if (rounds.length === 0) return { statusLine: 'Waiting to start' }

  const allScored = rounds.every((r) => r.status === 'scored')
  if (allScored) return { statusLine: 'Tournament complete', badgeVariant: 'neutral', badgeLabel: 'Done' }

  const openRound = rounds.find((r) => r.status === 'open')
  if (openRound) {
    return {
      statusLine: 'Predictions open',
      badgeVariant: 'open',
      badgeLabel: 'Act now',
    }
  }

  const lockedRound = rounds.find((r) => r.status === 'locked')
  if (lockedRound) {
    if (data.isHost) {
      return { statusLine: 'Results needed', badgeVariant: 'live', badgeLabel: 'Host action' }
    }
    return { statusLine: 'Awaiting results', badgeVariant: 'locked', badgeLabel: 'Locked' }
  }

  return { statusLine: 'In progress' }
}

function GameCard({ game }: { game: GameCardData }) {
  if (game.notFound) return null

  return (
    <Link
      href={`/play/${game.code}`}
      className="flex items-center justify-between rounded-[var(--radius-card)] border border-line bg-card px-4 py-3.5 transition-all hover:bg-paper"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{game.name}</p>
        <p className="mt-0.5 text-[11px] text-muted">
          {game.statusLine ?? '\u2026'}
          {game.playerCount !== undefined && (
            <span className="ml-1.5 tabular-nums">{game.playerCount} player{game.playerCount !== 1 ? 's' : ''}</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {game.badgeVariant && game.badgeLabel && (
          <Badge variant={game.badgeVariant}>{game.badgeLabel}</Badge>
        )}
        <span className="text-xs font-mono tracking-wider text-muted">{game.code}</span>
      </div>
    </Link>
  )
}

export default function PlayLanding() {
  const { games, refresh } = useGameRegistry()
  const [enrichedGames, setEnrichedGames] = useState<GameCardData[]>([])
  const [loaded, setLoaded] = useState(false)
  const enrichedRef = useRef(false)

  // Enrich games from API on mount — only once
  useEffect(() => {
    if (enrichedRef.current || games.length === 0) return
    enrichedRef.current = true

    async function enrich() {
      const results = await Promise.all(
        games.map(async (entry): Promise<GameCardData> => {
          try {
            const res = await gameFetch(`/api/games/${entry.code}`)
            if (!res.ok) {
              removeGame(entry.code)
              return { ...entry, notFound: true }
            }
            const data = await res.json()
            const status = deriveStatus({
              rounds: data.rounds,
              isHost: data.currentPlayer?.isHost,
            })

            return {
              ...entry,
              name: data.game?.name ?? entry.name,
              playerCount: data.players?.length,
              statusLine: status.statusLine,
              badgeVariant: status.badgeVariant,
              badgeLabel: status.badgeLabel,
            }
          } catch {
            return { ...entry, statusLine: 'Offline' }
          }
        }),
      )

      setEnrichedGames(results.filter((g) => !g.notFound))
      setLoaded(true)
      refresh()
    }
    enrich()
  }, [games, refresh])

  const hasGames = loaded ? enrichedGames.length > 0 : games.length > 0
  const displayGames = loaded ? enrichedGames : games.map((g) => ({ ...g } as GameCardData))

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="animate-fadeIn text-center">
        <h1 className="mb-2 font-[family-name:var(--font-display)] text-[24px] font-bold text-ink">Multiplayer Predictions</h1>
        <p className="mb-10 text-[13.5px] text-muted">
          Compete with friends and family to see who&apos;s the best predictor of the FIFA World Cup 2026.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/play/new"
            className="inline-flex w-60 items-center justify-center gap-2 rounded-[var(--radius-card)] border border-line bg-card px-6 py-4 text-sm font-bold text-ink transition-all hover:bg-paper"
          >
            <span className="text-lg text-navy">+</span>
            Create a Game
          </Link>

          <Link
            href="/play/join"
            className="inline-flex w-60 items-center justify-center gap-2 rounded-[var(--radius-card)] border border-line bg-card px-6 py-4 text-sm font-bold text-ink transition-all hover:bg-paper"
          >
            <span className="text-lg text-navy">&#8594;</span>
            Join with Code
          </Link>
        </div>

        {/* My Games */}
        {hasGames && (
          <div className="mt-12 text-left">
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
              My Games
            </h2>
            <div className="space-y-2">
              {displayGames.map((game) => (
                <GameCard key={game.code} game={game} />
              ))}
            </div>
          </div>
        )}

        {/* How it works — only show when no games */}
        {!hasGames && (
          <div className="mt-16 rounded-[var(--radius-card)] border border-line bg-card p-6 text-left">
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-[17px] font-bold text-ink">How it works</h2>
            <ol className="space-y-2 text-[13.5px] text-muted">
              <li><strong className="text-ink">1.</strong> Host creates a game and shares the 6-character code</li>
              <li><strong className="text-ink">2.</strong> Players join with the code and a display name</li>
              <li><strong className="text-ink">3.</strong> Each round, everyone predicts match scores</li>
              <li><strong className="text-ink">4.</strong> Host locks predictions and enters real results</li>
              <li><strong className="text-ink">5.</strong> Points are awarded automatically:</li>
            </ol>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-tier-exact-bg px-3 py-2 text-center">
                <div className="text-lg font-extrabold text-tier-exact-ink tabular-nums">5 pts</div>
                <div className="text-tier-exact-ink/70">Exact score</div>
              </div>
              <div className="rounded-lg bg-tier-gd-bg px-3 py-2 text-center">
                <div className="text-lg font-extrabold text-tier-gd-ink tabular-nums">3 pts</div>
                <div className="text-tier-gd-ink/70">Result + GD</div>
              </div>
              <div className="rounded-lg bg-tier-result-bg px-3 py-2 text-center">
                <div className="text-lg font-extrabold text-tier-result-ink tabular-nums">1 pt</div>
                <div className="text-tier-result-ink/70">Correct result</div>
              </div>
              <div className="rounded-lg bg-tier-zero-bg px-3 py-2 text-center">
                <div className="text-lg font-extrabold text-tier-zero-ink tabular-nums">0 pts</div>
                <div className="text-tier-zero-ink/70">Wrong</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
