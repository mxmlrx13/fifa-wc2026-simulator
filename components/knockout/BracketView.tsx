'use client'

import type { KnockoutMatch } from '@/lib/types'
import BracketRound from './BracketRound'

interface BracketViewProps {
  matches: KnockoutMatch[]
}

const roundOrder = ['R32', 'R16', 'QF', 'SF', 'F', '3RD'] as const

export default function BracketView({ matches }: BracketViewProps) {
  const roundMatches: Record<string, KnockoutMatch[]> = {}
  for (const round of roundOrder) {
    roundMatches[round] = matches.filter((m) => m.round === round)
  }

  return (
    <div className="space-y-8">
      {/* Desktop: horizontal bracket layout */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto pb-4">
          <div className="inline-flex items-start gap-4">
            {roundOrder.map((round, roundIdx) => {
              const rm = roundMatches[round]
              if (rm.length === 0) return null

              const nextRound = roundOrder[roundIdx + 1]
              const hasConnectors = round !== 'F' && round !== '3RD' && nextRound && roundMatches[nextRound]?.length > 0

              return (
                <div key={round} className="flex items-start">
                  <div className="relative flex flex-col items-center">
                    <BracketRound round={round} matches={rm} />
                  </div>

                  {hasConnectors && (
                    <div className="flex flex-col justify-center self-stretch px-1">
                      {Array.from({ length: Math.floor(rm.length / 2) }).map((_, i) => {
                        const matchHeight = 88
                        const pairTop = i * 2 * matchHeight + 32
                        return (
                          <div
                            key={i}
                            className="relative"
                            style={{
                              height: `${matchHeight}px`,
                              marginTop: i === 0 ? `${pairTop}px` : `${matchHeight}px`,
                            }}
                          >
                            <div className="absolute left-0 top-0 h-1/2 w-3 border-r border-t border-line" />
                            <div className="absolute bottom-0 left-0 h-1/2 w-3 border-b border-r border-line" />
                            <div className="absolute left-3 top-1/2 h-px w-3 bg-line" />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile: vertical stacked layout */}
      <div className="space-y-8 lg:hidden">
        {roundOrder.map((round) => {
          const rm = roundMatches[round]
          if (rm.length === 0) return null
          return (
            <div key={round}>
              <BracketRound round={round} matches={rm} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
