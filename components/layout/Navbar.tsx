'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useTournament } from '@/lib/store'
import { cn } from '@/lib/utils'

const steps = [
  { href: '/groups', label: 'Groups', num: 1 },
  { href: '/knockout', label: 'Knockout', num: 2 },
  { href: '/summary', label: 'Champion', num: 3 },
]

export default function Navbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const { allGroupsComplete, champion, state } = useTournament()

  const completedMatches = state.groupMatches.filter(
    (m) => m.homeScore !== null && m.awayScore !== null
  ).length
  const totalMatches = state.groupMatches.length

  function getStepStatus(step: typeof steps[number]) {
    if (step.num === 1) {
      if (allGroupsComplete) return 'done'
      if (pathname.startsWith('/groups') || pathname.startsWith('/standings')) return 'current'
      if (completedMatches > 0) return 'current'
      return 'future'
    }
    if (step.num === 2) {
      if (champion) return 'done'
      if (allGroupsComplete && pathname.startsWith('/knockout')) return 'current'
      if (allGroupsComplete) return 'current'
      return 'future'
    }
    if (step.num === 3) {
      if (champion) return 'done'
      return 'future'
    }
    return 'future'
  }

  const progressPct = champion
    ? 100
    : allGroupsComplete
      ? 50 + Math.round((Object.keys(state.knockoutPicks ?? {}).length / 32) * 50)
      : Math.round((completedMatches / totalMatches) * 50)

  return (
    <nav className="relative z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-accent">WC 2026</span>
            <span className="hidden text-xs text-gray-500 sm:inline">Simulator</span>
          </Link>

          {/* Desktop stepper */}
          <div className="hidden items-center gap-1 sm:flex">
            {steps.map((step, i) => {
              const status = getStepStatus(step)
              const isActive = pathname.startsWith(step.href) || (step.href === '/groups' && pathname.startsWith('/standings'))
              const canClick = status === 'done' || status === 'current'

              return (
                <div key={step.href} className="flex items-center">
                  {i > 0 && (
                    <div className={cn(
                      'mx-1 h-px w-6',
                      status === 'done' || (i === 1 && getStepStatus(steps[0]) === 'done')
                        ? 'bg-neon-green/50'
                        : 'bg-gray-200'
                    )} />
                  )}
                  {canClick ? (
                    <Link
                      href={step.href}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                        status === 'done' && 'text-neon-green',
                        status === 'done' && !isActive && 'hover:bg-neon-green/10',
                        status === 'current' && isActive && 'bg-accent/15 text-accent glow-accent',
                        status === 'current' && !isActive && 'text-accent/70 hover:bg-accent/10'
                      )}
                    >
                      <span className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                        status === 'done' && 'bg-neon-green/20 text-neon-green',
                        status === 'current' && 'bg-accent/20 text-accent'
                      )}>
                        {status === 'done' ? '\u2713' : step.num}
                      </span>
                      {step.label}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-400">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-400">
                        {step.num}
                      </span>
                      {step.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Progress badge + Play link */}
          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/play"
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                pathname.startsWith('/play')
                  ? 'bg-neon-green/15 text-neon-green'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              Play
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-gray-500">{progressPct}%</span>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 sm:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-gray-200 pb-3 pt-2 sm:hidden">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              Home
            </Link>
            {steps.map((step) => {
              const status = getStepStatus(step)
              const canClick = status === 'done' || status === 'current'
              return canClick ? (
                <Link
                  key={step.href}
                  href={step.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    pathname.startsWith(step.href)
                      ? 'text-accent'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  {step.label}
                </Link>
              ) : (
                <span
                  key={step.href}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-gray-400"
                >
                  {step.label}
                </span>
              )
            })}
            <Link
              href="/standings"
              onClick={() => setMenuOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              Standings
            </Link>
            <Link
              href="/play"
              onClick={() => setMenuOpen(false)}
              className={cn(
                'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith('/play')
                  ? 'text-neon-green'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              Play
            </Link>
            {/* Mobile progress */}
            <div className="mt-2 flex items-center gap-2 px-3">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500">{progressPct}%</span>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
