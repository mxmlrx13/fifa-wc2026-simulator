'use client'

import { Suspense, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import JoinGameForm from '@/components/multiplayer/JoinGameForm'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'
import { isOnboarded, markOnboarded } from '@/lib/hooks/use-onboarding'
import Skeleton from '@/components/ui/Skeleton'

function JoinPageInner() {
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code')?.toUpperCase() ?? undefined

  // Determine initial onboarding state synchronously (no effect needed)
  const shouldOnboard = useMemo(
    () => Boolean(codeFromUrl && !isOnboarded()),
    [codeFromUrl],
  )
  const [showOnboarding, setShowOnboarding] = useState(shouldOnboard)

  function handleOnboardingComplete() {
    markOnboarded()
    setShowOnboarding(false)
  }

  if (showOnboarding) {
    return <OnboardingFlow mode="join" onComplete={handleOnboardingComplete} />
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/play" className="mb-6 inline-block text-[11px] text-muted hover:text-ink">
        &larr; Back
      </Link>
      <JoinGameForm initialCode={codeFromUrl} />
    </div>
  )
}

export default function JoinGamePage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Skeleton variant="card" />
      </div>
    }>
      <JoinPageInner />
    </Suspense>
  )
}
