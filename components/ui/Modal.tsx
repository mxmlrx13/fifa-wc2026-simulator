'use client'

import Button from './Button'

interface ModalProps {
  title: string
  children: React.ReactNode
  confirmLabel?: string
  confirmVariant?: 'primary' | 'destructive'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function Modal({
  title,
  children,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  loading = false,
}: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-ink/20"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm rounded-[var(--radius-card)] border border-line bg-card p-6 shadow-float animate-slideUp">
        <h3 className="mb-2 font-[family-name:var(--font-display)] text-[17px] font-bold text-ink">
          {title}
        </h3>
        <div className="mb-6 text-[13.5px] text-muted">
          {children}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
