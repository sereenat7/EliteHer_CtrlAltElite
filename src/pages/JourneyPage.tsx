import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl'
import { CheckCircle2, LocateFixed, Play, StopCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { evaluateRisk, type AIDetectionSettings, type JourneySample } from '../lib/aiSafety'
import { DEMO_DESTINATIONS, createDemoSosEvent } from '../lib/demoData'
import { env, mapStyleUrl } from '../lib/env'
import { clearWatch, getCurrentPosition, watchPosition } from '../lib/location'
import { getPref } from '../lib/prefs'
import { supabase } from '../lib/supabase'
import { useAuth } from '../app/auth/AuthProvider'

type Place = { name: string; center: [number, number] }

type RouteInfo = {
  geometry: { coordinates: [number, number][] }
  distance: number
  duration: number
}

function metersToKm(m: number) {
  return `${(m / 1000).toFixed(1)} km`
}

function secondsToMin(s: number) {
  return `${Math.round(s / 60)} min`
}

async function geocode(q: string): Promise<Place[]> {
  if (!env.maptilerKey) {
    const needle = q.toLowerCase()
    return DEMO_DESTINATIONS.filter((d) => d.name.toLowerCase().includes(needle)).slice(0, 5)
  }
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
    q,
  )}.json?autocomplete=true&limit=5&key=${env.maptilerKey}`
  const res = await fetch(url)
  if (!res.ok) return DEMO_DESTINATIONS.slice(0, 5)
  const json = await res.json()
  const live = (json.features ?? []).map((f: any) => ({
    name: f.place_name,
    center: f.center as [number, number],
  }))
  return live.length ? live : DEMO_DESTINATIONS.slice(0, 5)
}

function haversineMeters(a: [number, number], b: [number, number]) {
  const toRad = (x: number) => (x * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

function pseudoRoute(origin: [number, number], dest: [number, number]): RouteInfo {
  // MapTiler Cloud provides maps + geocoding; for v1 we render a simple straight-line route.
  const distance = haversineMeters(origin, dest)
  const walkingSpeed = 1.4 // m/s
  return {
    geometry: { coordinates: [origin, dest] },
    distance,
    duration: distance / walkingSpeed,
  }
}

export function JourneyPage() {
  const { session } = useAuth()
  const mapRef = useRef<MapLibreMap | null>(null)
  const mapDivRef = useRef<HTMLDivElement | null>(null)

  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [dest, setDest] = useState<Place | null>(null)
  const [route, setRoute] = useState<RouteInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [journeyId, setJourneyId] = useState<string | null>(null)
  const [watchId, setWatchId] = useState<string | null>(null)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [lastRiskText, setLastRiskText] = useState<string | null>(null)
  const [detectionSettings, setDetectionSettings] = useState<AIDetectionSettings>({
    enabled: true,
    stepDeviationMeters: 80,
    noResponseSeconds: 25,
    partyMovement: true,
    sensitivity: 3,
  })
  const samplesRef = useRef<JourneySample[]>([])
  const pendingEscalationRef = useRef<number | null>(null)

  const summary = useMemo(() => {
    if (!route) return null
    return `${metersToKm(route.distance)} • ${secondsToMin(route.duration)}`
  }, [route])

  useEffect(() => {
    if (!mapDivRef.current) return
    const style = mapStyleUrl()
    if (!style) return

    const map = new maplibregl.Map({
      container: mapDivRef.current,
      style,
      center: [77.5946, 12.9716],
      zoom: 12,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': 'rgba(236,72,153,0.9)', 'line-width': 5 },
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const src = map.getSource('route') as GeoJSONSource | undefined
    if (!src) return
    if (!route) {
      src.setData({ type: 'FeatureCollection', features: [] })
      return
    }
    src.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: route.geometry.coordinates },
          properties: {},
        },
      ],
    })
    const coords = route.geometry.coordinates
    if (coords.length) {
      map.fitBounds([coords[0], coords[coords.length - 1]], { padding: 60, duration: 700 })
    }
  }, [route])

  useEffect(() => {
    let active = true
    const t = setTimeout(async () => {
      if (!active) return
      if (query.trim().length < 3) return setPlaces([])
      const results = await geocode(query.trim())
      if (active) setPlaces(results)
    }, 250)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [query])

  useEffect(() => {
    ;(async () => {
      const settings = await getPref<AIDetectionSettings>('ai_detection', {
        enabled: true,
        stepDeviationMeters: 80,
        noResponseSeconds: 25,
        partyMovement: true,
        sensitivity: 3,
      })
      setDetectionSettings(settings)
    })()
  }, [])

  async function buildRoute(place: Place) {
    setBusy(true)
    try {
      const pos = await getCurrentPosition()
      const origin: [number, number] = [pos.coords.longitude, pos.coords.latitude]
      const r = pseudoRoute(origin, place.center)
      setDest(place)
      setRoute(r)
    } finally {
      setBusy(false)
    }
  }

  async function startJourney() {
    if (!session) return
    if (!dest) return
    setBusy(true)
    try {
      const pos = await getCurrentPosition()
      const originLat = pos.coords.latitude
      const originLng = pos.coords.longitude
      const [destLng, destLat] = dest.center

      const { data, error } = await supabase
        .from('journeys')
        .insert({
          origin_lat: originLat,
          origin_lng: originLng,
          dest_lat: destLat,
          dest_lng: destLng,
          status: 'active',
        })
        .select('id')
        .single()
      if (error) throw error
      const currentJourneyId = data.id
      setJourneyId(currentJourneyId)

      const id = await watchPosition(
        async (p) => {
          if (!dest) return
          const sample: JourneySample = {
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            speed: p.coords.speed ?? 0,
            accuracy: p.coords.accuracy ?? 0,
            ts: Date.now(),
          }
          samplesRef.current = [...samplesRef.current.slice(-19), sample]
          const risk = evaluateRisk(samplesRef.current, dest.center, detectionSettings)
          if (risk.score > 0) setLastRiskText(`Risk ${risk.score}/100 • ${risk.reasons[0] ?? 'Monitoring active'}`)

          if (risk.suspicious && !checkInOpen) {
            setCheckInOpen(true)
          }

          if (risk.dangerous && !pendingEscalationRef.current) {
            pendingEscalationRef.current = window.setTimeout(async () => {
              pendingEscalationRef.current = null
              const { error } = await supabase.from('sos_events').insert({
                journey_id: currentJourneyId,
                level: 1,
                status: 'triggered',
              })
              if (error) createDemoSosEvent(1)
            }, detectionSettings.noResponseSeconds * 1000)
          }
        },
        () => undefined,
      )
      setWatchId(id)
    } catch {
      // ignore (UI already usable)
    } finally {
      setBusy(false)
    }
  }

  async function stopJourney(status: 'completed' | 'cancelled') {
    if (!journeyId) return
    setBusy(true)
    try {
      await supabase
        .from('journeys')
        .update({ status, ended_at: new Date().toISOString() })
        .eq('id', journeyId)
      setJourneyId(null)
      setRoute(null)
      setDest(null)
      setPlaces([])
      setQuery('')
      if (watchId) await clearWatch(watchId)
      setWatchId(null)
      samplesRef.current = []
      setLastRiskText(null)
      if (pendingEscalationRef.current) {
        window.clearTimeout(pendingEscalationRef.current)
        pendingEscalationRef.current = null
      }
    } finally {
      setBusy(false)
    }
  }

  async function centerOnMe() {
    const map = mapRef.current
    if (!map) return
    try {
      const pos = await getCurrentPosition()
      map.easeTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 15, duration: 700 })
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Safe Journey Mode</CardTitle>
            <CardDescription className="mt-1">
              Choose a destination and start continuous monitoring.
            </CardDescription>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={centerOnMe}
            leftIcon={<LocateFixed className="h-4 w-4" />}
          >
            Me
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Destination (search)"
          disabled={!!journeyId}
        />
        {!journeyId && places.length ? (
          <div className="space-y-2">
            {places.map((p) => (
              <button
                key={p.name}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
                onClick={() => buildRoute(p)}
              >
                {p.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        <div ref={mapDivRef} className="h-[45vh] w-full" />
        {summary ? (
          <div className="absolute left-3 top-3 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-zinc-200 backdrop-blur">
            Route: {summary}
          </div>
        ) : null}
        {lastRiskText ? (
          <div className="absolute bottom-3 left-3 rounded-xl border border-red-400/30 bg-black/60 px-3 py-2 text-xs text-red-100 backdrop-blur">
            {lastRiskText}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          to={
            dest
              ? `/ar?dest=${encodeURIComponent(dest.name)}&lon=${dest.center[0]}&lat=${dest.center[1]}`
              : '/ar'
          }
        >
          <Button variant="secondary" className="w-full" disabled={!dest}>
            AR navigation
          </Button>
        </Link>
        <Link to="/safe-places">
          <Button variant="secondary" className="w-full">
            Safe places
          </Button>
        </Link>
      </div>

      {!journeyId ? (
        <Button
          className="w-full"
          onClick={startJourney}
          disabled={!dest || busy}
          leftIcon={<Play className="h-4 w-4" />}
        >
          Start journey
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => stopJourney('completed')}
            disabled={busy}
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
          >
            I’m safe
          </Button>
          <Button
            className="w-full"
            variant="danger"
            onClick={() => stopJourney('cancelled')}
            disabled={busy}
            leftIcon={<StopCircle className="h-4 w-4" />}
          >
            Cancel
          </Button>
        </div>
      )}

      <Modal
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        title="Check-in"
      >
        <div className="space-y-3">
          <div className="text-sm text-zinc-300">
            We detected abnormal conditions (low GPS accuracy / sudden movement). Are you safe?
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setCheckInOpen(false)}>
              Yes
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                setCheckInOpen(false)
                if (pendingEscalationRef.current) {
                  window.clearTimeout(pendingEscalationRef.current)
                  pendingEscalationRef.current = null
                }
                // Trigger SOS escalation via DB row (pluggable providers)
                const { error } = await supabase.from('sos_events').insert({
                  journey_id: journeyId,
                  level: 1,
                  status: 'triggered',
                })
                if (error) createDemoSosEvent(1)
              }}
            >
              Need help
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
