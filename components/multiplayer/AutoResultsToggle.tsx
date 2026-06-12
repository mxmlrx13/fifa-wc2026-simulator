'use client'

import { useState, useEffect } from 'react'

interface AutoResultsToggleProps {
  code: string
  pendingCount?: number
}

export default function AutoResultsToggle({ code, pendingCount: initialPending }: AutoResultsToggleProps) {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [pendingCount, setPendingCount] = useState(initialPending ?? 0)
  const [toggling, setToggling] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [fetchResult, setFetchResult] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/games/${code}/auto-results`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setEnabled(data.enabled)
          setPendingCount(data.pendingSuggestions ?? 0)
        }
      })
      .catch(() => {})
  }, [code])

  async function handleToggle() {
    if (enabled === null) return
    setToggling(true)
    const res = await fetch(`/api/games/${code}/auto-results`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    })
    if (res.ok) {
      const data = await res.json()
      setEnabled(data.enabled)
    }
    setToggling(false)
  }

  async function handleFetchNow() {
    setFetching(true)
    setFetchResult(null)
    const res = await fetch(`/api/games/${code}/auto-results`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      const parts: string[] = []
      if (data.autoApplied > 0) parts.push(`${data.autoApplied} applied`)
      if (data.flagged > 0) parts.push(`${data.flagged} for review`)
      if (parts.length === 0 && data.errors?.length === 0) parts.push('No new results found')
      if (data.errors?.length > 0) parts.push(data.errors[0])
      setFetchResult(parts.join(', '))
      // Refresh pending count
      const statusRes = await fetch(`/api/games/${code}/auto-results`)
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setPendingCount(statusData.pendingSuggestions ?? 0)
      }
    } else {
      setFetchResult('Failed to fetch results')
    }
    setFetching(false)
  }

  if (enabled === null) return null

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
            Automatic Results
          </h3>
          <p className="mt-1 text-[11px] text-muted">
            Finished match scores are entered automatically when two sources agree. Anything uncertain waits for your review.
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`relative ml-4 h-6 w-11 shrink-0 rounded-full transition-colors ${
            enabled ? 'bg-navy' : 'bg-line'
          } ${toggling ? 'opacity-50' : ''}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-paper shadow transition-transform ${
              enabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>
      {enabled && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleFetchNow}
            disabled={fetching}
            className={`rounded-[var(--radius-pill)] border border-line px-3 py-1 text-[11px] font-bold transition-all ${
              fetching ? 'opacity-50' : 'hover:bg-paper hover:text-ink'
            } text-muted`}
          >
            {fetching ? 'Fetching...' : 'Fetch results now'}
          </button>
          {fetchResult && (
            <span className="text-[11px] text-muted">{fetchResult}</span>
          )}
        </div>
      )}
      {pendingCount > 0 && (
        <p className="mt-2 text-[11px] font-semibold text-navy">
          {pendingCount} result{pendingCount !== 1 ? 's' : ''} awaiting your review
        </p>
      )}
    </div>
  )
}
