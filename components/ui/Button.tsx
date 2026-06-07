import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-navy text-paper font-bold hover:brightness-94 active:brightness-90',
  secondary:
    'bg-card text-ink border border-line font-semibold text-[13px] hover:bg-paper active:bg-line/40',
  destructive:
    'bg-red text-white font-bold hover:brightness-94 active:brightness-90',
  ghost:
    'bg-transparent text-ink font-semibold hover:bg-line/40 active:bg-line/60',
}

export default function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] px-[18px] py-[13px] text-[13.5px] min-h-[var(--touch-target-min,44px)] transition-all',
        'disabled:bg-out-soft disabled:text-out-ink disabled:cursor-not-allowed',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
