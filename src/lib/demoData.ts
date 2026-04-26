export type DemoIncident = {
  id: string
  type: string
  severity: number
  description: string | null
  lat: number
  lng: number
  created_at: string
  verified: boolean
}

export type DemoSosEvent = {
  id: string
  level: number
  status: 'triggered' | 'acknowledged' | 'resolved'
  created_at: string
}

export type DemoSafePlace = {
  id: string
  name: string
  type: 'hospital' | 'police' | 'fire_station' | 'pharmacy'
  lat: number
  lng: number
  address?: string
}

const INCIDENTS_KEY = 'saaya_demo_incidents_v1'
const SOS_KEY = 'saaya_demo_sos_v1'
const LAST_GENERATED_KEY = 'saaya_demo_last_generated_v1'

const MUMBAI_SEED_INCIDENTS: DemoIncident[] = [
  {
    id: 'seed-inc-1',
    type: 'Harassment',
    severity: 4,
    description: 'Crowd issue near Dadar station foot over bridge',
    lat: 19.0176,
    lng: 72.8478,
    created_at: new Date(Date.now() - 1000 * 60 * 17).toISOString(),
    verified: true,
  },
  {
    id: 'seed-inc-2',
    type: 'Suspicious activity',
    severity: 3,
    description: 'Unusual loitering reported near Bandra Linking Road',
    lat: 19.0608,
    lng: 72.8363,
    created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    verified: false,
  },
  {
    id: 'seed-inc-3',
    type: 'Stalking',
    severity: 5,
    description: 'Repeated follow incident around Powai Lake main gate',
    lat: 19.1176,
    lng: 72.906,
    created_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    verified: true,
  },
  {
    id: 'seed-inc-4',
    type: 'Theft',
    severity: 2,
    description: 'Phone snatch report near Marine Drive promenade',
    lat: 18.9441,
    lng: 72.8236,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    verified: false,
  },
  {
    id: 'seed-inc-5',
    type: 'Violence',
    severity: 5,
    description: 'Assistance requested near Kurla East market road',
    lat: 19.0728,
    lng: 72.8797,
    created_at: new Date(Date.now() - 1000 * 60 * 230).toISOString(),
    verified: true,
  },
  {
    id: 'seed-inc-6',
    type: 'Suspicious activity',
    severity: 3,
    description: 'Late-night concern near Andheri Metro entrance',
    lat: 19.1197,
    lng: 72.8464,
    created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    verified: false,
  },
]

export const MUMBAI_SAFE_PLACES: DemoSafePlace[] = [
  { id: 'sp-1', name: 'Bandra Police Station', type: 'police', lat: 19.0544, lng: 72.8403 },
  { id: 'sp-2', name: 'Dadar Police Station', type: 'police', lat: 19.0187, lng: 72.8421 },
  { id: 'sp-3', name: 'KEM Hospital', type: 'hospital', lat: 19.0037, lng: 72.8414 },
  { id: 'sp-4', name: 'Lilavati Hospital', type: 'hospital', lat: 19.0511, lng: 72.8265 },
  { id: 'sp-5', name: 'Sion Hospital', type: 'hospital', lat: 19.0434, lng: 72.8633 },
  { id: 'sp-6', name: 'Byculla Fire Station', type: 'fire_station', lat: 18.9817, lng: 72.8333 },
  { id: 'sp-7', name: 'Andheri Fire Station', type: 'fire_station', lat: 19.1136, lng: 72.8492 },
  { id: 'sp-8', name: 'Apollo Pharmacy Bandra', type: 'pharmacy', lat: 19.066, lng: 72.8347 },
]

const MUMBAI_HOTSPOTS = [
  { lat: 19.0176, lng: 72.8478, label: 'Dadar Station' },
  { lat: 19.0608, lng: 72.8363, label: 'Bandra Linking Road' },
  { lat: 19.1176, lng: 72.906, label: 'Powai Lake' },
  { lat: 18.9441, lng: 72.8236, label: 'Marine Drive' },
  { lat: 19.0728, lng: 72.8797, label: 'Kurla East Market' },
  { lat: 19.1197, lng: 72.8464, label: 'Andheri Metro' },
]

const INCIDENT_TEMPLATES: Array<{ type: string; description: string; severity: number }> = [
  { type: 'Suspicious activity', description: 'Suspicious movement near', severity: 3 },
  { type: 'Harassment', description: 'Verbal harassment reported around', severity: 4 },
  { type: 'Stalking', description: 'Possible stalking alert near', severity: 5 },
  { type: 'Theft', description: 'Pickpocket incident reported near', severity: 2 },
  { type: 'Violence', description: 'Assistance requested near', severity: 5 },
]

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage issues in demo mode
  }
}

export function getDemoIncidents() {
  const local = readJson<DemoIncident[]>(INCIDENTS_KEY, [])
  return [...local, ...MUMBAI_SEED_INCIDENTS].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

export function createDemoIncident(payload: {
  type: string
  severity: number
  description: string | null
  lat: number
  lng: number
}) {
  const incident: DemoIncident = {
    id: `demo-inc-${crypto.randomUUID()}`,
    type: payload.type,
    severity: payload.severity,
    description: payload.description,
    lat: payload.lat,
    lng: payload.lng,
    created_at: new Date().toISOString(),
    verified: false,
  }
  const current = readJson<DemoIncident[]>(INCIDENTS_KEY, [])
  writeJson(INCIDENTS_KEY, [incident, ...current].slice(0, 150))
  return incident
}

export function maybeGenerateDemoIncident() {
  const now = Date.now()
  const last = Number(localStorage.getItem(LAST_GENERATED_KEY) ?? '0')
  if (now - last < 55_000) return null

  const hotspot = MUMBAI_HOTSPOTS[Math.floor(Math.random() * MUMBAI_HOTSPOTS.length)]
  const template = INCIDENT_TEMPLATES[Math.floor(Math.random() * INCIDENT_TEMPLATES.length)]
  const jitter = () => (Math.random() - 0.5) * 0.01

  const incident = createDemoIncident({
    type: template.type,
    severity: Math.min(5, Math.max(1, template.severity + Math.round((Math.random() - 0.5) * 2))),
    description: `${template.description} ${hotspot.label}`,
    lat: hotspot.lat + jitter(),
    lng: hotspot.lng + jitter(),
  })

  localStorage.setItem(LAST_GENERATED_KEY, String(now))
  return incident
}

export function getDemoSosEvents() {
  const local = readJson<DemoSosEvent[]>(SOS_KEY, [])
  return [...local].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

export function createDemoSosEvent(level = 1) {
  const ev: DemoSosEvent = {
    id: `demo-sos-${crypto.randomUUID()}`,
    level,
    status: 'triggered',
    created_at: new Date().toISOString(),
  }
  const current = readJson<DemoSosEvent[]>(SOS_KEY, [])
  writeJson(SOS_KEY, [ev, ...current].slice(0, 100))
  return ev
}

export function updateDemoSosEvent(
  id: string,
  patch: Partial<Pick<DemoSosEvent, 'level' | 'status'>>,
) {
  const current = readJson<DemoSosEvent[]>(SOS_KEY, [])
  const next = current.map((x) => (x.id === id ? { ...x, ...patch } : x))
  writeJson(SOS_KEY, next)
}
