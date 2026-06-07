import Button from './Button'

interface EmptyStateProps {
  label: string
  message: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ label, message, action }: EmptyStateProps) {
  return (
    <div className="py-10 text-center">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
        {label}
      </p>
      <p className="text-[13.5px] text-muted">{message}</p>
      {action && (
        <div className="mt-4">
          <Button variant="secondary" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}
