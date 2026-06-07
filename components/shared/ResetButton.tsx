'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'

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
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-button)] border border-red-line bg-red-soft px-4 py-2 text-sm font-semibold text-red transition-all hover:bg-red-soft/80"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {label}
      </button>

      {showModal && (
        <Modal
          title="Are you sure?"
          confirmLabel="Confirm"
          confirmVariant="destructive"
          onConfirm={() => {
            onConfirm()
            setShowModal(false)
          }}
          onCancel={() => setShowModal(false)}
        >
          {confirmMessage}
        </Modal>
      )}
    </>
  )
}
