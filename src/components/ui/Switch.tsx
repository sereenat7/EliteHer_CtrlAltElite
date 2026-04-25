import { cn } from '../../lib/utils'

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  label,
}: {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  disabled?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 items-center rounded-full border border-white/10 bg-white/10 transition disabled:cursor-not-allowed disabled:opacity-60',
        checked ? 'bg-pink-500/35' : '',
      )}
    >
      <span
        className={cn(
          'inline-block h-6 w-6 translate-x-0 rounded-full bg-white shadow transition',
          checked ? 'translate-x-5 bg-pink-200' : 'bg-zinc-200',
        )}
      />
    </button>
  )
}
