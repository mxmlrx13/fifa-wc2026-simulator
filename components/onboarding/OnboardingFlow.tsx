'use client'

import { useState } from 'react'
import { CountdownBadgeInline } from '@/components/ui/CountdownBadge'
import {
  DEADLINE_ENFORCEMENT_ENABLED,
  getPredictionRoundDeadline,
} from '@/lib/data/schedule'
import { cn } from '@/lib/utils'

const TOTAL_STEPS = 5

interface OnboardingFlowProps {
  /** "Join the game →" (first visit) or "Back" (re-entry from menu). */
  mode: 'join' | 'back'
  onComplete: () => void
}

function ProgressDots({ current }: { current: number }) {
  return (
    <div className="flex justify-center gap-1.5 pb-1.5 pt-3.5">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={cn(
            'h-[7px] rounded-full transition-all duration-200',
            i === current ? 'w-[18px] bg-red' : 'w-[7px] bg-line',
          )}
        />
      ))}
    </div>
  )
}

function NavRow({
  showSkip,
  nextLabel,
  onNext,
  onSkip,
}: {
  showSkip: boolean
  nextLabel: string
  onNext: () => void
  onSkip?: () => void
}) {
  return (
    <div className="flex items-center gap-2.5 pt-3.5">
      {showSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="px-2.5 py-2.5 text-xs font-semibold text-muted"
        >
          Skip
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        className="flex-1 rounded-[var(--radius-button)] bg-navy px-4 py-[13px] text-[13.5px] font-bold text-paper transition-all hover:brightness-94"
      >
        {nextLabel}
      </button>
    </div>
  )
}

function DeadlinePill() {
  if (!DEADLINE_ENFORCEMENT_ENABLED) {
    return <span className="inline-flex items-center rounded-full bg-red px-2.5 py-1 text-[10.5px] font-bold text-white">locks at kickoff</span>
  }

  const deadline = getPredictionRoundDeadline('group').toISOString()
  return <CountdownBadgeInline deadline={deadline} />
}

// ─── Visual blocks ───────────────────────────────────────────────────────────

function TimelineViz() {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-3.5">
      <div className="relative pl-[26px]">
        {/* Vertical line */}
        <div className="absolute left-[8px] top-[6px] bottom-[6px] w-[2px] bg-line" />

        {/* Stop 1: hot */}
        <div className="relative pb-3.5">
          <div className="absolute -left-[23px] top-[3px] h-[11px] w-[11px] rounded-full border-[2.5px] border-red bg-red" />
          <div className="text-[12.5px] font-extrabold text-ink">Now → first kickoff</div>
          <div className="text-[11.5px] leading-relaxed text-muted">predict everything</div>
        </div>

        {/* Stop 2 */}
        <div className="relative pb-3.5">
          <div className="absolute -left-[23px] top-[3px] h-[11px] w-[11px] rounded-full border-[2.5px] border-out bg-card" />
          <div className="text-[12.5px] font-extrabold text-ink">Group stage</div>
          <div className="text-[11.5px] leading-relaxed text-muted">points roll in after every matchday</div>
        </div>

        {/* Stop 3 */}
        <div className="relative">
          <div className="absolute -left-[23px] top-[3px] h-[11px] w-[11px] rounded-full border-[2.5px] border-out bg-card" />
          <div className="text-[12.5px] font-extrabold text-ink">Knockouts → Final</div>
          <div className="text-[11.5px] leading-relaxed text-muted">fresh picks each round, stakes rise</div>
        </div>
      </div>
    </div>
  )
}

function ScoreViz() {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-3.5">
      <div className="flex items-center justify-between gap-1.5 text-[13px] font-semibold">
        <span>🇫🇷 FRA</span>
        <span className="flex gap-1.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] border-[1.5px] border-line bg-input text-[15px] font-extrabold text-ink">3</span>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] border-[1.5px] border-line bg-input text-[15px] font-extrabold text-ink">1</span>
        </span>
        <span>GER 🇩🇪</span>
      </div>
      <div className="mt-1.5 text-center">
        <DeadlinePill />
      </div>
    </div>
  )
}

function PointsViz() {
  const rows: Array<{ label: string; pts: string; cls: string }> = [
    { label: 'Exact score', pts: '5', cls: 'bg-red text-white' },
    { label: 'Right result + goal difference', pts: '3', cls: 'bg-win-soft text-win-ink' },
    { label: 'Right result', pts: '1', cls: 'bg-runner-soft text-runner-ink' },
    { label: 'Wrong', pts: '0', cls: 'bg-out-soft text-out-ink' },
  ]
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-3.5">
      {rows.map((r, i) => (
        <div
          key={r.pts}
          className={cn(
            'flex items-center justify-between py-[7px] text-[12.5px]',
            i < rows.length - 1 && 'border-b border-line',
          )}
        >
          <span>{r.label}</span>
          <span className={cn('inline-flex min-w-[30px] items-center justify-center rounded-lg px-2 py-0.5 text-[12.5px] font-extrabold', r.cls)}>
            {r.pts}
          </span>
        </div>
      ))}
    </div>
  )
}

function KnockoutViz() {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-3.5">
      <div className="flex gap-[7px]">
        <div className="flex flex-1 items-center gap-[7px] rounded-[11px] border-[1.5px] border-red bg-red-soft p-[11px] text-[13px] font-bold">
          🇦🇹 Austria
          <span className="ml-auto font-black text-red">✓</span>
        </div>
        <div className="flex flex-1 items-center gap-[7px] rounded-[11px] border-[1.5px] border-line bg-input p-[11px] text-[13px] font-bold">
          🇺🇸 USA
        </div>
      </div>
      <div className="mt-2 text-center">
        <span className="inline-flex items-center rounded-full bg-badge-bg px-2.5 py-1 text-[10.5px] font-bold text-ink">
          Round of 32 · 3 pts per pick
        </span>
      </div>
    </div>
  )
}

function LeaderboardViz() {
  const rows = [
    { rank: '1', name: 'Pierre', pts: '47', you: false },
    { rank: '2', name: 'You', pts: '44', you: true },
    { rank: '3', name: 'Anna', pts: '41', you: false },
  ]
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-3.5">
      {rows.map((r) => (
        <div
          key={r.rank}
          className={cn(
            'flex items-center gap-2.5 rounded-[10px] px-1.5 py-[7px] text-[13px]',
            r.you && 'bg-red-soft outline outline-1 outline-red-line',
          )}
        >
          <span className="w-[18px] text-right font-extrabold text-muted">{r.rank}</span>
          <span className="flex-1 font-semibold">{r.name}</span>
          <span className="font-extrabold">{r.pts}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const STEP_CONTENT: Array<{
  num: string
  title: string
  body: React.ReactNode
  viz: React.ReactNode
}> = [
  {
    num: 'Your ticket',
    title: 'Five weeks of football. One table of truth.',
    body: (
      <p>Someone you know started a prediction game. Here&apos;s the itinerary — read it, you&apos;ll be quizzed by reality.</p>
    ),
    viz: <TimelineViz />,
  },
  {
    num: 'Step 1 · Before kickoff',
    title: 'Homework first: 72 scores.',
    body: (
      <p>Every group match gets a scoreline from you before the opening whistle. Pick a champion too (<b>+10</b> if they go all the way). Then the host locks it — <b>no edits, no excuses</b>.</p>
    ),
    viz: <ScoreViz />,
  },
  {
    num: 'Step 2 · Scoring',
    title: 'Closer tip, more points.',
    body: <p>When real results come in, points land automatically:</p>,
    viz: <PointsViz />,
  },
  {
    num: 'Step 3 · Knockouts',
    title: 'Pick winners, round by round.',
    body: (
      <p>No crystal ball needed: when the real bracket is known, you pick who advances — <b>fresh picks before every round</b>. And they&apos;re worth more each time: 3 → 4 → 5 → 6 → 8 pts.</p>
    ),
    viz: <KnockoutViz />,
  },
  {
    num: 'Step 4 · Glory',
    title: 'Climb. Gloat. Repeat.',
    body: <p>Live leaderboard after every matchday, point-by-point breakdowns, and bragging rights until 2030.</p>,
    viz: <LeaderboardViz />,
  },
]

export default function OnboardingFlow({ mode, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)

  function goTo(n: number) {
    setStep(n)
  }

  function handleSkip() {
    goTo(TOTAL_STEPS - 1)
  }

  const isLast = step === TOTAL_STEPS - 1
  const content = STEP_CONTENT[step]

  const nextLabel = isLast
    ? mode === 'join'
      ? 'Join the game →'
      : 'Back'
    : step === 0
      ? 'Show me'
      : 'Next'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper">
      <div className="flex h-full w-full max-w-[420px] flex-col px-6 py-6 md:h-auto md:max-h-[640px]">
        {/* Step content — flex-1 with fade */}
        <div
          key={step}
          className={cn(
            'flex flex-1 flex-col',
            'motion-safe:animate-[onboardFade_250ms_ease]',
          )}
        >
          <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-red mb-2.5">
            {content.num}
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-[23px] font-bold leading-[1.2] tracking-[-0.01em] text-ink mb-2.5">
            {content.title}
          </h2>
          <div className="text-[13px] leading-[1.65] text-muted mb-4 [&_b]:text-ink">
            {content.body}
          </div>
          <div className="mb-auto">
            {content.viz}
          </div>

          <NavRow
            showSkip={!isLast}
            nextLabel={nextLabel}
            onNext={isLast ? onComplete : () => goTo(step + 1)}
            onSkip={handleSkip}
          />
        </div>

        <ProgressDots current={step} />
      </div>
    </div>
  )
}
