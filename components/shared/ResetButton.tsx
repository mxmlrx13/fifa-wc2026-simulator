'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ResetButtonProps {
  label: string
  onConfirm: () => void
  confirmMessage: string
}

export default function ResetButton({ label, onConfirm, confirmMessage }: ResetButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-neon-red/20 bg-neon-red/10 px-4 py-2 text-sm font-medium text-neon-red transition-all hover:bg-neon-red/20"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {label}
      </button>

      {/* Modal overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal */}
          <div className={cn(
            'relative glass-card w-full max-w-sm rounded-xl border border-neon-red/20 p-6 animate-slideUp'
          )}>
            <h3 className="mb-2 text-base font-bold text-gray-900">Are you sure?</h3>
            <p className="mb-6 text-sm text-gray-500">{confirmMessage}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm()
                  setShowModal(false)
                }}
                className="rounded-lg bg-neon-red px-4 py-2 text-sm font-bold text-white transition-all hover:brightness-110"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
