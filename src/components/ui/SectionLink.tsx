import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'

export function SectionLink({
  to,
  title,
  description,
  left,
  className,
}: {
  to: string
  title: string
  description?: string
  left?: React.ReactNode
  className?: string
}) {
  return (
    <Link to={to}>
      <div
        className={cn(
          'flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur hover:bg-white/5',
          className,
        )}
      >
        <div className="flex items-center gap-3">
          {left ? (
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10">
              {left}
            </div>
          ) : null}
          <div>
            <div className="text-sm font-semibold">{title}</div>
            {description ? (
              <div className="text-xs text-zinc-400">{description}</div>
            ) : null}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-400" />
      </div>
    </Link>
  )
}

