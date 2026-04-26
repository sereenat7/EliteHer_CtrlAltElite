import 'maplibre-gl/dist/maplibre-gl.css'
import { ShieldAlert, Siren, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './app/auth/AuthProvider'
import { TabsLayout } from './app/layout/TabsLayout'
import { AppLogo } from './components/AppLogo'
import { AlertsPage } from './pages/AlertsPage'
import { AIDetectionPage } from './pages/AIDetectionPage'
import { ARNavigationPage } from './pages/ARNavigationPage'
import { ContactsPage } from './pages/ContactsPage'
import { EcosystemPage } from './pages/EcosystemPage'
import { EmergencyPage } from './pages/EmergencyPage'
import { HiddenModePage } from './pages/HiddenModePage'
import { HomeMapPage } from './pages/HomeMapPage'
import { JourneyPage } from './pages/JourneyPage'
import { NearbyUsersPage } from './pages/NearbyUsersPage'
import { OfflineQueuePage } from './pages/OfflineQueuePage'
import { RecordingPage } from './pages/RecordingPage'
import { ReportIncidentPage } from './pages/ReportIncidentPage'
import { SafePlacesPage } from './pages/SafePlacesPage'
import { SettingsPage } from './pages/SettingsPage'
import { SosPage } from './pages/SosPage'
import { SosEscalationPage } from './pages/SosEscalationPage'
import { WitnessesPage } from './pages/WitnessesPage'

function LandingPage() {
  const { t } = useTranslation()
  const highlights = [
    {
      title: t('landing.detectTitle', { defaultValue: 'Detect Risk' }),
      text: t('landing.detectText', {
        defaultValue: 'AI-inspired safety signals monitor patterns and crowd risk in real time.',
      }),
      icon: ShieldAlert,
    },
    {
      title: t('landing.actTitle', { defaultValue: 'Act Automatically' }),
      text: t('landing.actText', {
        defaultValue: 'SOS escalation, evidence capture, and emergency workflows run instantly.',
      }),
      icon: Siren,
    },
    {
      title: t('landing.informTitle', { defaultValue: 'Inform Community' }),
      text: t('landing.informText', {
        defaultValue: 'Nearby users and trusted contacts can be alerted for rapid support.',
      }),
      icon: Users,
    },
  ]

  return (
    <div className="bg-app min-h-full px-5 pb-8 pt-6 text-zinc-100">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="overflow-hidden rounded-3xl border border-pink-300/20 bg-black/40 backdrop-blur">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80"
              alt="Woman walking confidently at night in the city"
              className="h-52 w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
            <div className="landing-quote-glow absolute inset-x-3 bottom-14 rounded-xl border border-white/15 bg-black/45 px-3 py-2 backdrop-blur">
              <div className="landing-quote-text text-xs font-semibold text-pink-100">
                {t('landing.quote', {
                  defaultValue: '"Tonight, I made it home safe. Saaya stayed with me all the way."',
                })}
              </div>
            </div>
            <div className="absolute bottom-3 left-3">
              <AppLogo showWordmark />
            </div>
          </div>
          <div className="p-6 pt-4">
          <div className="text-center">
            <div className="text-3xl font-extrabold tracking-tight">
              {t('landing.heroTitle', { defaultValue: 'You are never alone.' })}
            </div>
            <p className="mt-2 text-sm text-zinc-300">
              {t('landing.heroText', {
                defaultValue:
                  'Saaya stands beside every woman with intelligent protection, instant SOS action, and community support that reaches you when it matters most.',
              })}
            </p>
          </div>
          <div className="mt-5 space-y-2">
            <Link
              to="/app"
              className="block rounded-xl bg-pink-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-pink-400"
            >
              {t('landing.startCta', { defaultValue: 'Start Your Safe Journey' })}
            </Link>
            <Link
              to="/app/alerts"
              className="block rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            >
              {t('landing.seeActionCta', { defaultValue: 'See Live Safety Action' })}
            </Link>
          </div>
          </div>
        </div>

        <div className="space-y-2">
          {highlights.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="h-4 w-4 text-pink-200" />
                  {item.title}
                </div>
                <div className="mt-1 text-xs text-zinc-300">{item.text}</div>
              </div>
            )
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-zinc-300">
          {t('landing.supportText', {
            defaultValue:
              'Hidden mode, low-battery fallback, offline escalation, and digital witness support are built in to keep protection always on.',
          })}
        </div>

        <div className="rounded-2xl border border-pink-300/25 bg-gradient-to-r from-pink-500/15 to-purple-500/15 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-pink-100">
            {t('landing.storyLabel', { defaultValue: 'Saaya Story' })}
          </div>
          <div className="mt-1 text-sm font-bold text-white">
            {t('landing.storyTitle', { defaultValue: 'She reached home safe.' })}
          </div>
          <div className="mt-1 text-xs text-zinc-200">
            {t('landing.storyText', {
              defaultValue:
                'Route watched. Alerts monitored. SOS ready. This is what women-first safety should feel like: calm, supported, and protected.',
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Link
            to="/app"
            className="block rounded-xl bg-pink-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-pink-400"
          >
            {t('landing.openMapCta', { defaultValue: 'Open Live Safety Map' })}
          </Link>
          <div className="text-center text-xs text-zinc-400">
            {t('landing.creditText', {
              defaultValue: 'Inspired by the Saaya experience flow and adapted for app-first navigation.',
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function AppGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth()
  const { t } = useTranslation()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 2200)
    return () => window.clearTimeout(timer)
  }, [])

  if (loading || showSplash) {
    return (
      <div className="bg-app grid h-full place-items-center px-6">
        <div className="w-full max-w-xs rounded-3xl border border-white/10 bg-black/30 p-6 text-center backdrop-blur">
          <div className="saaya-loader-perspective mx-auto">
            <div className="saaya-loader-safety-core">
              <div className="saaya-safety-ring saaya-safety-ring-outer" />
              <div className="saaya-safety-ring saaya-safety-ring-mid" />
              <div className="saaya-safety-ring saaya-safety-ring-inner" />
              <div className="saaya-safety-badge">
                <div className="saaya-safety-badge-title">HER SAFE</div>
                <div className="saaya-safety-badge-sub">LIVE SHIELD</div>
              </div>
            </div>
          </div>
          <AppLogo className="mt-5 justify-center" showWordmark />
          <div className="mt-3 text-xs text-zinc-300">
            {t('loading.safetyBoot', {
              defaultValue: 'Activating women safety shield, SOS layers, and live map intelligence...',
            })}
          </div>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppGate>
          <Routes>
            <Route path="/" element={<LandingPage />} />

            <Route path="/app" element={<TabsLayout />}>
              <Route index element={<HomeMapPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="journey" element={<JourneyPage />} />
              <Route path="ar" element={<ARNavigationPage />} />
              <Route path="safe-places" element={<SafePlacesPage />} />
              <Route path="report" element={<ReportIncidentPage />} />
              <Route path="sos" element={<SosPage />} />
              <Route path="sos/escalation" element={<SosEscalationPage />} />
              <Route path="emergency" element={<EmergencyPage />} />
              <Route path="recording" element={<RecordingPage />} />
              <Route path="witnesses" element={<WitnessesPage />} />
              <Route path="nearby-users" element={<NearbyUsersPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="ai-detection" element={<AIDetectionPage />} />
              <Route path="hidden-mode" element={<HiddenModePage />} />
              <Route path="offline-queue" element={<OfflineQueuePage />} />
              <Route path="ecosystem" element={<EcosystemPage />} />
            </Route>

            <Route path="/alerts" element={<Navigate to="/app/alerts" replace />} />
            <Route path="/journey" element={<Navigate to="/app/journey" replace />} />
            <Route path="/ar" element={<Navigate to="/app/ar" replace />} />
            <Route path="/safe-places" element={<Navigate to="/app/safe-places" replace />} />
            <Route path="/report" element={<Navigate to="/app/report" replace />} />
            <Route path="/sos" element={<Navigate to="/app/sos" replace />} />
            <Route path="/sos/escalation" element={<Navigate to="/app/sos/escalation" replace />} />
            <Route path="/emergency" element={<Navigate to="/app/emergency" replace />} />
            <Route path="/recording" element={<Navigate to="/app/recording" replace />} />
            <Route path="/witnesses" element={<Navigate to="/app/witnesses" replace />} />
            <Route path="/nearby-users" element={<Navigate to="/app/nearby-users" replace />} />
            <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
            <Route path="/contacts" element={<Navigate to="/app/contacts" replace />} />
            <Route path="/ai-detection" element={<Navigate to="/app/ai-detection" replace />} />
            <Route path="/hidden-mode" element={<Navigate to="/app/hidden-mode" replace />} />
            <Route path="/offline-queue" element={<Navigate to="/app/offline-queue" replace />} />
            <Route path="/ecosystem" element={<Navigate to="/app/ecosystem" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppGate>
      </HashRouter>
    </AuthProvider>
  )
}
