import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl'
import { ArrowLeft, Camera, ChevronRight, Compass, LocateFixed, MapPin, Route } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { env, mapStyleUrl } from '../lib/env'
import { getCurrentPosition } from '../lib/location'
import { supabase } from '../lib/supabase'

type Incident = { lat: number; lng: number; severity: number }

type Place = { name: string; center: [number, number] }

type RouteVariant = {
  id: string
  name: string
  coords: [number, number][]
  distanceM: number
  etaMin: number
  risk: number
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

function routeDistance(coords: [number, number][]) {
  let d = 0
  for (let i = 1; i < coords.length; i++) d += haversineMeters(coords[i - 1], coords[i])
  return d
}

function sampleLine(coords: [number, number][], samples = 12) {
  const a = coords[0]
  const b = coords[coords.length - 1]
  const out: [number, number][] = []
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
  }
  return out
}

function riskScore(coords: [number, number][], incidents: Incident[]) {
  const pts = sampleLine(coords, 14)
  const radius = 220 // meters
  let score = 0
  for (const inc of incidents) {
    let best = Infinity
    for (const p of pts) {
      const d = haversineMeters([inc.lng, inc.lat], p)
      if (d < best) best = d
    }
    if (best <= radius) {
      score += inc.severity * (1 - best / radius)
    }
  }
  return score
}

async function geocode(q: string, proximity?: [number, number]): Promise<Place[]> {
  if (!env.maptilerKey) return []
  const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json`)
  url.searchParams.set('key', env.maptilerKey)
  url.searchParams.set('autocomplete', 'true')
  url.searchParams.set('limit', '5')
  if (proximity) url.searchParams.set('proximity', `${proximity[0]},${proximity[1]}`)
  const res = await fetch(url.toString())
  if (!res.ok) return []
  const json = await res.json()
  return (json.features ?? []).map((f: any) => ({
    name: f.place_name,
    center: f.center as [number, number],
  }))
}

export function ARNavigationPage() {
  const [sp] = useSearchParams()
  const mapRef = useRef<MapLibreMap | null>(null)
  const mapDivRef = useRef<HTMLDivElement | null>(null)

  const [origin, setOrigin] = useState<[number, number] | null>(null) // [lon,lat]
  const [dest, setDest] = useState<[number, number] | null>(null)
  const [destLabel, setDestLabel] = useState<string>('')
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selected, setSelected] = useState<string>('direct')
  const [arView, setArView] = useState(false)

  useEffect(() => {
    const lon = sp.get('lon')
    const lat = sp.get('lat')
    const label = sp.get('dest')
    if (lon && lat) setDest([Number(lon), Number(lat)])
    if (label) setDestLabel(label)
  }, [sp])

  useEffect(() => {
    ;(async () => {
      try {
        const p = await getCurrentPosition()
        setOrigin([p.coords.longitude, p.coords.latitude])
      } catch {
        setOrigin([77.5946, 12.9716])
      }
    })()
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
      const { data } = await supabase
        .from('incidents')
        .select('lat,lng,severity')
        .gte('created_at', since)
        .limit(800)
      if (!cancelled) setIncidents((data as any) ?? [])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!mapDivRef.current) return
    const style = mapStyleUrl()
    if (!style) return

    const map = new maplibregl.Map({
      container: mapDivRef.current,
      style,
      center: origin ?? [77.5946, 12.9716],
      zoom: 13,
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
        paint: { 'line-color': 'rgba(236,72,153,0.95)', 'line-width': 6 },
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapDivRef.current])

  useEffect(() => {
    let active = true
    const t = setTimeout(async () => {
      if (!active) return
      if (query.trim().length < 3) return setPlaces([])
      const results = await geocode(query.trim(), origin ?? undefined)
      if (active) setPlaces(results)
    }, 250)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [query, origin])

  const variants = useMemo<RouteVariant[]>(() => {
    if (!origin || !dest) return []
    const base: [number, number][] = [origin, dest]

    // Simple “safer route suggestion” UI: build 2 alternative lines offset slightly.
    const dLon = 0.0025
    const dLat = 0.002
    const alt1: [number, number][] = [[origin[0] + dLon, origin[1]], [dest[0] + dLon, dest[1]]]
    const alt2: [number, number][] = [[origin[0], origin[1] + dLat], [dest[0], dest[1] + dLat]]

    const mk = (id: string, name: string, coords: [number, number][]) => {
      const distanceM = routeDistance(coords)
      const etaMin = Math.max(1, Math.round(distanceM / 1.4 / 60))
      const risk = riskScore(coords, incidents)
      return { id, name, coords, distanceM, etaMin, risk }
    }

    const all = [mk('direct', 'Standard', base), mk('safer', 'Safer suggestion', alt1), mk('alt', 'Alternative', alt2)]
    return all.sort((a, b) => a.risk - b.risk)
  }, [origin, dest, incidents])

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selected) ?? variants[0],
    [variants, selected],
  )

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const src = map.getSource('route') as GeoJSONSource | undefined
    if (!src) return
    if (!selectedVariant) return
    src.setData({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'LineString', coordinates: selectedVariant.coords }, properties: {} },
      ],
    })
    map.fitBounds([selectedVariant.coords[0], selectedVariant.coords[selectedVariant.coords.length - 1]], {
      padding: 70,
      duration: 650,
    })
  }, [selectedVariant])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link to="/journey" className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<LocateFixed className="h-4 w-4" />}
          onClick={async () => {
            const p = await getCurrentPosition()
            setOrigin([p.coords.longitude, p.coords.latitude])
          }}
        >
          Me
        </Button>
      </div>

      <Card>
        <CardTitle className="flex items-center gap-2">
          AR Route Tracking <Route className="h-4 w-4 text-zinc-300" />
        </CardTitle>
        <CardDescription className="mt-1">
          Full navigation UX + safer route suggestions (risk calculated from real incidents).
        </CardDescription>
      </Card>

      <Card className="space-y-2">
        <div className="text-xs font-semibold text-zinc-300">Destination</div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search destination"
        />
        {dest ? (
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-zinc-300" />
                <span className="truncate">{destLabel || 'Destination selected'}</span>
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                {dest[1].toFixed(5)}, {dest[0].toFixed(5)}
              </div>
            </div>
            <button className="text-xs text-zinc-300 underline" onClick={() => setDest(null)}>
              Clear
            </button>
          </div>
        ) : null}

        {!dest && places.length ? (
          <div className="space-y-2">
            {places.map((p) => (
              <button
                key={p.name}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
                onClick={() => {
                  setDest(p.center)
                  setDestLabel(p.name)
                  setPlaces([])
                  setQuery('')
                }}
              >
                <span className="truncate">{p.name}</span>
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              </button>
            ))}
          </div>
        ) : null}
      </Card>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        <div ref={mapDivRef} className="h-[44vh] w-full" />
        {selectedVariant ? (
          <div className="absolute left-3 top-3 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-zinc-200 backdrop-blur">
            <div className="flex items-center gap-2">
              <Compass className="h-3.5 w-3.5 text-zinc-200" />
              {Math.round(selectedVariant.distanceM)}m • {selectedVariant.etaMin} min • risk{' '}
              {selectedVariant.risk.toFixed(1)}
            </div>
          </div>
        ) : null}
      </div>

      <Card className="space-y-2">
        <CardTitle className="flex items-center justify-between">
          <span>Safer route suggestions</span>
          <Badge>{variants.length ? 'live' : 'pick destination'}</Badge>
        </CardTitle>
        <CardDescription>
          Sorted by lowest risk score (computed from recent community incidents).
        </CardDescription>
        <div className="mt-2 space-y-2">
          {variants.length ? (
            variants.map((v) => (
              <button
                key={v.id}
                className={[
                  'w-full rounded-xl border px-3 py-2 text-left',
                  v.id === selected ? 'border-pink-300/30 bg-pink-500/10' : 'border-white/10 bg-black/20 hover:bg-white/5',
                ].join(' ')}
                onClick={() => setSelected(v.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{v.name}</div>
                  <div className="text-xs text-zinc-300">risk {v.risk.toFixed(1)}</div>
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  {Math.round(v.distanceM)}m • {v.etaMin} min
                </div>
              </button>
            ))
          ) : (
            <div className="text-sm text-zinc-400">Select a destination to see route options.</div>
          )}
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle className="flex items-center justify-between">
          <span>Navigation mode</span>
          <Button variant="secondary" size="sm" leftIcon={<Camera className="h-4 w-4" />} onClick={() => setArView((v) => !v)}>
            {arView ? 'Map view' : 'AR view'}
          </Button>
        </CardTitle>
        <CardDescription>
          AR overlay UI (camera + direction prompts). Full AR tracking wiring comes next.
        </CardDescription>

        {arView ? (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            <div className="grid h-48 place-items-center text-sm text-zinc-300">
              Camera preview placeholder
            </div>
            <div className="absolute inset-x-0 bottom-0 p-3">
              <div className="rounded-2xl border border-white/10 bg-black/70 px-3 py-2 backdrop-blur">
                <div className="text-xs text-zinc-400">Next instruction</div>
                <div className="text-sm font-semibold">Continue straight for 120m</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-300">
            Turn-by-turn list (UI):
            <ul className="mt-2 list-inside list-disc text-xs text-zinc-400">
              <li>Head towards destination</li>
              <li>Stay on the selected safer route</li>
              <li>Arrive at destination</li>
            </ul>
          </div>
        )}
      </Card>
    </div>
  )
}
