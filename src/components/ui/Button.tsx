import * as React from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-pink-400 to-pink-600 text-white shadow-[0_14px_40px_-22px_rgba(236,72,153,0.8)] hover:from-pink-300 hover:to-pink-500 active:from-pink-400 active:to-pink-600 disabled:opacity-50',
  secondary:
    'bg-white/10 text-white hover:bg-white/15 active:bg-white/10 disabled:opacity-60',
  danger:
    'bg-gradient-to-b from-red-400 to-red-600 text-white hover:from-red-300 hover:to-red-500 active:from-red-400 active:to-red-600 disabled:opacity-50',
  ghost: 'bg-transparent text-zinc-200 hover:bg-white/10 active:bg-white/10',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold ring-1 ring-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {leftIcon ? <span className="-ml-1">{leftIcon}</span> : null}
      <span>{children}</span>
      {rightIcon ? <span className="-mr-1">{rightIcon}</span> : null}
    </button>
  )
}
