'use client'

interface ScoreInputProps {
  value: number | null
  onChange: (value: number | null) => void
}

export default function ScoreInput({ value, onChange }: ScoreInputProps) {
  return (
    <input
      type="number"
      min={0}
      max={99}
      value={value ?? ''}
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
      className="w-12 rounded-md bg-gray-100 px-1 py-2 text-center text-sm font-bold text-foreground transition-all focus:border-accent focus:shadow-[0_0_0_2px_rgba(163,136,42,0.2)] focus:outline-none"
    />
  )
}
