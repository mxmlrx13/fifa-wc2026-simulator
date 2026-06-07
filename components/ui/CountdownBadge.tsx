'use client'

import { useState, useEffect } from 'react'
import Badge from './Badge'

interface CountdownBadgeProps {
  deadline: string // ISO 8601 UTC
  className?: string
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'locked'
  const totalMinutes = Math.floor(ms / 60_000)
  const totalHours = Math.floor(totalMinutes / 60)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const minutes = totalMinutes % 60

  if (days > 0) return `locks in ${days}d ${hours}h`
  if (hours > 0) return `locks in ${hours}h ${minutes}m`
  return `locks in ${minutes}m`
}

function formatLocalTime(iso: string): string {
  try {
    const date = new Date(iso)
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    }).format(date)
  } catch {
    return ''
  }
}

/**
 * Live countdown badge for round deadlines.
 * Updates every minute. Shows 'live' (red) variant when < 24h remain.
 * Renders the absolute local time below the badge.
 */
export default function CountdownBadge({ deadline, className }: CountdownBadgeProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const remaining = new Date(deadline).getTime() - now
  if (remaining <= 0) return null

  const isUrgent = remaining < 24 * 60 * 60_000

  return (
    <div className={className}>
      <Badge variant={isUrgent ? 'live' : 'open'}>
        {formatRemaining(remaining)}
      </Badge>
      <p className="mt-0.5 text-[10px] text-muted tabular-nums">
        {formatLocalTime(deadline)}
      </p>
    </div>
  )
}

/**
 * Inline countdown (no sublabel), for tight spaces like app bars.
 */
export function CountdownBadgeInline({ deadline, className }: CountdownBadgeProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const remaining = new Date(deadline).getTime() - now
  if (remaining <= 0) return null

  const isUrgent = remaining < 24 * 60 * 60_000

  return (
    <Badge variant={isUrgent ? 'live' : 'open'} className={className}>
      {formatRemaining(remaining)}
    </Badge>
  )
}
