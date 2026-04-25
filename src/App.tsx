import 'maplibre-gl/dist/maplibre-gl.css'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './app/auth/AuthProvider'
import { TabsLayout } from './app/layout/TabsLayout'
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
  if (loading) return <div className="bg-app h-full" />
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
