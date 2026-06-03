import Link from 'next/link'

export default function PlayLanding() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="animate-fadeIn text-center">
        <h1 className="mb-2 text-3xl font-bold text-accent">Multiplayer Predictions</h1>
        <p className="mb-10 text-sm text-gray-500">
          Compete with friends and family to see who&apos;s the best predictor of the FIFA World Cup 2026.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/play/new"
            className="glass-card glow-accent inline-flex w-60 items-center justify-center gap-2 px-6 py-4 text-sm font-bold text-accent transition-all hover:bg-accent/10"
          >
            <span className="text-lg">+</span>
            Create a Game
          </Link>

          <Link
            href="/play/join"
            className="glass-card inline-flex w-60 items-center justify-center gap-2 px-6 py-4 text-sm font-bold text-foreground transition-all hover:bg-gray-100"
          >
            <span className="text-lg">&#8594;</span>
            Join with Code
          </Link>
        </div>

        <div className="mt-16 glass-card p-6 text-left">
          <h2 className="mb-3 text-sm font-bold text-accent">How it works</h2>
          <ol className="space-y-2 text-xs text-gray-500">
            <li><strong className="text-foreground">1.</strong> Host creates a game and shares the 6-character code</li>
            <li><strong className="text-foreground">2.</strong> Players join with the code and a display name</li>
            <li><strong className="text-foreground">3.</strong> Each round, everyone predicts match scores</li>
            <li><strong className="text-foreground">4.</strong> Host locks predictions and enters real results</li>
            <li><strong className="text-foreground">5.</strong> Points are awarded automatically:</li>
          </ol>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-accent/10 px-3 py-2 text-center">
              <div className="text-lg font-bold text-accent">5 pts</div>
              <div className="text-gray-500">Exact score</div>
            </div>
            <div className="rounded-lg bg-neon-green/10 px-3 py-2 text-center">
              <div className="text-lg font-bold text-neon-green">3 pts</div>
              <div className="text-gray-500">Result + GD</div>
            </div>
            <div className="rounded-lg bg-neon-blue/10 px-3 py-2 text-center">
              <div className="text-lg font-bold text-neon-blue">1 pt</div>
              <div className="text-gray-500">Correct result</div>
            </div>
            <div className="rounded-lg bg-gray-100 px-3 py-2 text-center">
              <div className="text-lg font-bold text-gray-500">0 pts</div>
              <div className="text-gray-500">Wrong</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
