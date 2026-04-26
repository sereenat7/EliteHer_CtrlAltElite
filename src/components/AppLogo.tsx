type AppLogoProps = {
  className?: string
  showWordmark?: boolean
}

export function AppLogo({ className = '', showWordmark = true }: AppLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <div className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-pink-500/20 ring-1 ring-pink-300/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.28),transparent_55%)]" />
        <span className="relative text-lg font-black text-pink-100">S</span>
      </div>
      {showWordmark ? (
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Saaya</div>
          <div className="text-xs text-zinc-400">Stay alert. Stay safe.</div>
        </div>
      ) : null}
    </div>
  )
}
