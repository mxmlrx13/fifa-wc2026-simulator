'use client'

import { useState } from 'react'
import { PREDICTION_ROUND_LABELS, type PredictionRoundKey } from '@/lib/constants'

const DISMISSED_KEY = 'wc26-ko-instructions-seen'

function hasSeen(code: string, roundKey: string): boolean {
  if (typeof localStorage === 'undefined') return true
  const val = localStorage.getItem(`${DISMISSED_KEY}:${code}`)
  if (!val) return false
  const seen: string[] = JSON.parse(val)
  return seen.includes(roundKey)
}

function markSeen(code: string, roundKey: string) {
  if (typeof localStorage === 'undefined') return
  const val = localStorage.getItem(`${DISMISSED_KEY}:${code}`)
  const seen: string[] = val ? JSON.parse(val) : []
  if (!seen.includes(roundKey)) seen.push(roundKey)
  localStorage.setItem(`${DISMISSED_KEY}:${code}`, JSON.stringify(seen))
}

const ROUND_MATCH_COUNT: Record<string, number> = {
  r32: 16,
  r16: 8,
  qf: 4,
  sf: 2,
  final: 2,
}

const ROUND_POINTS: Record<string, number> = {
  r32: 3,
  r16: 4,
  qf: 5,
  sf: 6,
  final: 8,
}

interface Props {
  code: string
  roundKey: PredictionRoundKey
}

export default function KnockoutInstructionsCard({ code, roundKey }: Props) {
  const [dismissed, setDismissed] = useState(() => hasSeen(code, roundKey))

  if (dismissed || roundKey === 'group') return null

  const roundLabel = PREDICTION_ROUND_LABELS[roundKey]
  const matchCount = ROUND_MATCH_COUNT[roundKey] ?? 4
  const basePoints = ROUND_POINTS[roundKey] ?? 3
  const isFirstKnockout = roundKey === 'r32'

  function handleDismiss() {
    markSeen(code, roundKey)
    setDismissed(true)
  }

  return (
    <div className="mb-6 rounded-[var(--radius-card)] border border-navy/20 bg-navy/5 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[13px] font-bold text-navy">
            {isFirstKnockout
              ? 'Knockout stage is here!'
              : `${roundLabel} predictions are open!`}
          </h3>

          {isFirstKnockout ? (
            <div className="mt-2 space-y-1.5 text-[11.5px] text-ink/80">
              <p>
                The format changes from group stage. For each match, predict the
                score <strong>and</strong> pick a winner. If scores are tied,
                you'll pick who wins on penalties.
              </p>
              <p>
                <strong>{matchCount} matches</strong> to predict.
                Points escalate each round: <strong>{basePoints} pts</strong> for
                a correct winner + <strong>2 bonus</strong> for the exact score.
              </p>
              <p>
                Predictions auto-lock when the first match kicks off. Don't
                miss it!
              </p>
            </div>
          ) : (
            <div className="mt-2 space-y-1.5 text-[11.5px] text-ink/80">
              <p>
                <strong>{matchCount} match{matchCount !== 1 ? 'es' : ''}</strong> to
                predict. <strong>{basePoints} pts</strong> per correct winner
                + <strong>2 bonus</strong> for the exact score.
              </p>
              <p>
                Predictions auto-lock at kickoff. Enter your picks before the
                deadline!
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="shrink-0 text-[11px] font-semibold text-navy/60 hover:text-navy transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
