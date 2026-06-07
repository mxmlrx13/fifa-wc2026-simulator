'use client'

interface ScoreInputProps {
  value: number | null
  onChange: (value: number | null) => void
}

export default function ScoreInput({ value, onChange }: ScoreInputProps) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={99}
      value={value ?? ''}
      placeholder="–"
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') {
          onChange(null)
          return
        }
        const num = parseInt(raw, 10)
        if (!isNaN(num) && num >= 0 && num <= 99) {
          onChange(num)
        }
      }}
      className="h-11 w-12 rounded-[var(--radius-input)] border-[1.5px] border-dashed border-line bg-input px-1 py-2 text-center text-[15px] font-extrabold text-ink tabular-nums transition-all placeholder:text-muted focus:border-solid focus:border-navy focus:outline-none"
    />
  )
}
