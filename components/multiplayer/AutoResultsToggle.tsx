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
      {pendingCount > 0 && (
        <p className="mt-2 text-[11px] font-semibold text-navy">
          {pendingCount} result{pendingCount !== 1 ? 's' : ''} awaiting your review
        </p>
      )}
    </div>
  )
}
