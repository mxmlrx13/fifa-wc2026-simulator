import Link from 'next/link'

export default function PlayLanding() {
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
      </div>
    </div>
  )
}
