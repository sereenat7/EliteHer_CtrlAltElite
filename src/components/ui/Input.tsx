import * as React from 'react'
import { cn } from '../../lib/utils'

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-zinc-500 outline-none ring-0 transition focus:border-pink-300/50 focus:ring-2 focus:ring-pink-300/20',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none ring-0 transition focus:border-pink-300/50 focus:ring-2 focus:ring-pink-300/20',
        className,
      )}
      {...props}
    />
  )
}

