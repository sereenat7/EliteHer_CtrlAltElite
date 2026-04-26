import { AlertTriangle, Bell, Map, Route, Settings, Siren, ShieldPlus } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguagePicker } from '../../components/LanguagePicker'
import { cn } from '../../lib/utils'

export function TabsLayout() {
  const { t } = useTranslation()
  const tabs = [
    { to: '/', label: t('tabs.map'), icon: Map, end: true },
    { to: '/alerts', label: t('tabs.alerts'), icon: Bell },
    { to: '/journey', label: t('tabs.journey'), icon: Route },
    { to: '/report', label: t('tabs.report'), icon: ShieldPlus },
    { to: '/sos', label: t('tabs.sos'), icon: Siren },
  ]

  return (
    <div className="bg-app h-full text-zinc-100">
      <div className="mx-auto flex h-full max-w-md flex-col">
        <header className="flex items-center justify-between px-4 pb-2 pt-5">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-pink-500/15 ring-1 ring-pink-400/30">
              <AlertTriangle className="h-5 w-5 text-pink-200" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">{t('app.name')}</div>
              <div className="text-xs text-zinc-400">{t('app.tagline')}</div>
            </div>
          </div>
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
          <div className="grid grid-cols-5 px-2 py-2">
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
