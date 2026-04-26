import 'maplibre-gl/dist/maplibre-gl.css'
import { ShieldAlert, Siren, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
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
  const highlights = [
    {
      title: 'Detect Risk',
      text: 'AI-inspired safety signals monitor patterns and crowd risk in real time.',
      icon: ShieldAlert,
    },
    {
      title: 'Act Automatically',
      text: 'SOS escalation, evidence capture, and emergency workflows run instantly.',
      icon: Siren,
    },
    {
      title: 'Inform Community',
      text: 'Nearby users and trusted contacts can be alerted for rapid support.',
      icon: Users,
    },
  ]

  return (
    <div className="bg-app min-h-full px-5 pb-8 pt-6 text-zinc-100">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="rounded-3xl border border-pink-300/20 bg-black/40 p-6 backdrop-blur">
          <AppLogo className="justify-center" showWordmark />
          <div className="mt-5 text-center">
            <div className="text-3xl font-extrabold tracking-tight">Your Guardian in the Dark.</div>
            <p className="mt-2 text-sm text-zinc-300">
              Saaya predicts risk, triggers smart safety actions, and keeps help close even when
              you cannot reach your phone.
            </p>
          </div>
          <div className="mt-5 space-y-2">
            <Link
              to="/app"
              className="block rounded-xl bg-pink-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-pink-400"
            >
              Start Your Safe Journey
            </Link>
            <Link
              to="/app/alerts"
              className="block rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            >
              See it in Action
            </Link>
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
          Hidden mode, low-battery fallback, offline escalation, and digital witness support are
          built in to keep protection always on.
        </div>

        <div className="space-y-2">
          <Link
            to="/app"
            className="block rounded-xl bg-pink-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-pink-400"
          >
            Open Live Safety Map
          </Link>
          <div className="text-center text-xs text-zinc-400">
            Inspired by the Saaya experience flow and adapted for app-first navigation.
          </div>
        </div>
      </div>
    </div>
  )
}

function AppGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth()
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
            <div className="saaya-loader-cube">
              <div className="saaya-face saaya-face-front">S</div>
              <div className="saaya-face saaya-face-back">S</div>
              <div className="saaya-face saaya-face-right">S</div>
              <div className="saaya-face saaya-face-left">S</div>
              <div className="saaya-face saaya-face-top">S</div>
              <div className="saaya-face saaya-face-bottom">S</div>
            </div>
          </div>
          <AppLogo className="mt-5 justify-center" showWordmark />
          <div className="mt-3 text-xs text-zinc-300">Preparing live safety heatmap...</div>
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
