import { Bell, Map, Settings, Siren, ShieldPlus } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthProvider'
import { LanguagePicker } from '../../components/LanguagePicker'
import { AppLogo } from '../../components/AppLogo'
import { getPref } from '../../lib/prefs'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'

type HiddenPrefs = {
  enabled: boolean
  silentHaptics: boolean
  tripleTapHeaderSos: boolean
  longPressSos: boolean
}

const HIDDEN_DEFAULTS: HiddenPrefs = {
  enabled: true,
  silentHaptics: true,
  tripleTapHeaderSos: true,
  longPressSos: true,
}

export function TabsLayout() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const navigate = useNavigate()
  const headerTapTimesRef = useRef<number[]>([])
  const holdTimerRef = useRef<number | null>(null)
  const batteryAlertedRef = useRef(false)

  async function triggerHiddenSos(_reason: string) {
    if (!session) return
    const { data, error } = await supabase
      .from('sos_events')
      .insert({ level: 1, status: 'triggered' })
      .select('id')
      .single()
    if (error) return
    navigate(`/sos/escalation?id=${data.id}`)
  }

  useEffect(() => {
    const onPointerDown = async (event: PointerEvent) => {
      const p = await getPref<HiddenPrefs>('hidden_mode', HIDDEN_DEFAULTS)
      if (!p.enabled || !p.tripleTapHeaderSos) return

      const target = event.target as HTMLElement | null
      if (!target) return
      const inHeader = !!target.closest('[data-hidden-header="true"]')
      if (!inHeader) return

      const now = Date.now()
      headerTapTimesRef.current = headerTapTimesRef.current.filter((ts) => now - ts < 1400)
      headerTapTimesRef.current.push(now)
      if (headerTapTimesRef.current.length >= 3) {
        headerTapTimesRef.current = []
        await triggerHiddenSos('Hidden mode: triple-tap header SOS trigger')
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [session])

  useEffect(() => {
    let mounted = true
    const onPointerDown = async () => {
      const p = await getPref<HiddenPrefs>('hidden_mode', HIDDEN_DEFAULTS)
      if (!mounted || !p.enabled || !p.longPressSos) return
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = window.setTimeout(() => {
        void triggerHiddenSos('Hidden mode: long-press SOS trigger')
      }, 1800)
    }

    const cancel = () => {
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', cancel)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('pointerleave', cancel)

    return () => {
      mounted = false
      cancel()
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', cancel)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('pointerleave', cancel)
    }
  }, [session])

  useEffect(() => {
    let cancelled = false
    let detachBatteryEvents: (() => void) | null = null

    type BatteryManagerLike = {
      level: number
      charging: boolean
      addEventListener: (event: 'levelchange' | 'chargingchange', cb: () => void) => void
      removeEventListener: (event: 'levelchange' | 'chargingchange', cb: () => void) => void
    }

    const nav = navigator as Navigator & {
      getBattery?: () => Promise<BatteryManagerLike>
    }
    if (!nav.getBattery) return

    const maybeEscalate = async (level: number, charging: boolean) => {
      if (cancelled || batteryAlertedRef.current) return
      if (charging || level > 0.1) return
      const p = await getPref<HiddenPrefs>('hidden_mode', HIDDEN_DEFAULTS)
      if (!p.enabled) return
      batteryAlertedRef.current = true
      await triggerHiddenSos('Low battery fallback: battery below 10%')
    }

    nav
      .getBattery()
      .then((battery) => {
        if (cancelled) return
        const onChange = () => {
          void maybeEscalate(battery.level, battery.charging)
        }
        void maybeEscalate(battery.level, battery.charging)
        battery.addEventListener('levelchange', onChange)
        battery.addEventListener('chargingchange', onChange)
        detachBatteryEvents = () => {
          battery.removeEventListener('levelchange', onChange)
          battery.removeEventListener('chargingchange', onChange)
        }
      })
      .catch(() => {
        // Browser may not support battery events.
      })

    return () => {
      cancelled = true
      if (detachBatteryEvents) detachBatteryEvents()
    }
  }, [session])

  const tabs = [
    { to: '/', label: t('tabs.map'), icon: Map, end: true },
    { to: '/alerts', label: t('tabs.alerts'), icon: Bell },
    { to: '/report', label: t('tabs.report'), icon: ShieldPlus },
    { to: '/sos', label: t('tabs.sos'), icon: Siren },
  ]

  return (
    <div className="bg-app h-full text-zinc-100">
      <div className="mx-auto flex h-full max-w-md flex-col">
        <header className="flex items-center justify-between px-4 pb-2 pt-5" data-hidden-header="true">
          <AppLogo />
          <div className="flex items-center gap-2">
            <LanguagePicker />
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  'grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-200 transition hover:bg-white/10',
                  isActive ? 'ring-2 ring-pink-300/30' : '',
                )
              }
              aria-label={t('tabs.settings')}
            >
              <Settings className="h-5 w-5" />
            </NavLink>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 pb-24">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-white/10 bg-black/70 backdrop-blur">
          <div className="grid grid-cols-4 px-2 py-2">
            {tabs.map((t) => {
              const Icon = t.icon
              return (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] transition',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
                    )
                  }
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span>{t.label}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
