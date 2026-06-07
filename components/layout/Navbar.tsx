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

  // Don't render global navbar inside /play/[code]/*
  if (/^\/play\/[A-Z0-9]{6}/i.test(pathname)) return null

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
    <nav className="relative z-50 border-b-2 border-ink bg-card">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-ink">WC 2026</span>
            <span className="hidden text-[11px] text-muted sm:inline">Simulator</span>
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
                        ? 'bg-win-ink/30'
                        : 'bg-line'
                    )} />
                  )}
                  {canClick ? (
                    <Link
                      href={step.href}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                        status === 'done' && 'text-win-ink',
                        status === 'done' && !isActive && 'hover:bg-win-soft',
                        status === 'current' && isActive && 'bg-navy text-paper',
                        status === 'current' && !isActive && 'text-navy hover:bg-line/40'
                      )}
                    >
                      <span className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                        status === 'done' && 'bg-win-soft text-win-ink',
                        status === 'current' && isActive && 'bg-paper/20 text-paper',
                        status === 'current' && !isActive && 'bg-navy/10 text-navy'
                      )}>
                        {status === 'done' ? '\u2713' : step.num}
                      </span>
                      {step.label}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-out-soft text-[10px] font-bold text-muted">
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
                  ? 'bg-navy text-paper'
                  : 'text-muted hover:bg-line/40 hover:text-ink',
              )}
            >
              Play
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-1 w-16 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-navy transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-muted tabular-nums">{progressPct}%</span>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-muted hover:bg-line/40 hover:text-ink sm:hidden"
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
          <div className="border-t border-line pb-3 pt-2 sm:hidden">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-line/40 hover:text-ink"
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
                      ? 'text-navy font-bold'
                      : 'text-muted hover:bg-line/40 hover:text-ink'
                  )}
                >
                  {step.label}
                </Link>
              ) : (
                <span
                  key={step.href}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-muted/50"
                >
                  {step.label}
                </span>
              )
            })}
            <Link
              href="/standings"
              onClick={() => setMenuOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-line/40 hover:text-ink"
            >
              Standings
            </Link>
            <Link
              href="/play"
              onClick={() => setMenuOpen(false)}
              className={cn(
                'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith('/play')
                  ? 'text-navy font-bold'
                  : 'text-muted hover:bg-line/40 hover:text-ink',
              )}
            >
              Play
            </Link>
            {/* Mobile progress */}
            <div className="mt-2 flex items-center gap-2 px-3">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-navy transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[10px] text-muted tabular-nums">{progressPct}%</span>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
