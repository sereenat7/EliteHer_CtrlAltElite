import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
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
            <Route path="/" element={<TabsLayout />}>
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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppGate>
      </HashRouter>
    </AuthProvider>
  )
}
