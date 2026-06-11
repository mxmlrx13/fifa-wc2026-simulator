'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'

const STORAGE_KEY = 'wc26-email-hint-dismissed'

function isDismissed(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) === '1'
}

function dismiss(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // storage unavailable
  }
}

export default function EmailHintModal({ onLinkNow }: { onLinkNow?: () => void }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isDismissed()) setShow(true)
  }, [])

  if (!show) return null

  function handleDismiss() {
    dismiss()
    setShow(false)
  }

  function handleLinkNow() {
    dismiss()
    setShow(false)
    onLinkNow?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink/20" onClick={handleDismiss} />
      <div className="relative w-full max-w-sm rounded-[var(--radius-card)] border border-line bg-card p-6 shadow-float animate-slideUp">
        <h3 className="mb-3 font-[family-name:var(--font-display)] text-[17px] font-bold text-ink">
          Never lose your predictions
        </h3>

        <div className="space-y-3 text-[13.5px] text-muted">
          <p>You can now link your email to your account. Here&apos;s why:</p>
          <ol className="list-none space-y-2.5 pl-0">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-paper">1</span>
              <span>Right now, your predictions only live in <strong className="text-ink">this browser</strong>. Clear cookies or switch devices and they&apos;re gone.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-paper">2</span>
              <span><strong className="text-ink">Link your email</strong> on the game dashboard and confirm via your inbox.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-paper">3</span>
              <span>From then on, <strong className="text-ink">sign in from any device</strong> with that email to access all your games.</span>
            </li>
          </ol>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={handleDismiss}>
            Maybe later
          </Button>
          <Button variant="primary" onClick={handleLinkNow}>
            Link my email
          </Button>
        </div>
      </div>
    </div>
  )
}
