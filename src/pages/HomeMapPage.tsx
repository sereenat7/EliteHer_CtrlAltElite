import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl'
import { LocateFixed, Navigation, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { QuickReportModal } from '../components/QuickReportModal'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { mapStyleUrl } from '../lib/env'
import { getCurrentPosition } from '../lib/location'
import { supabase } from '../lib/supabase'
import { cn, formatRelative } from '../lib/utils'

type Incident = {
  id: string
  type: string
  severity: number
  description: string | null
  lat: number
  lng: number
  created_at: string
  verified: boolean
}

function incidentsToGeoJson(incidents: Incident[]) {
  return {
    type: 'FeatureCollection' as const,
    features: incidents.map((i) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [i.lng, i.lat] as [number, number] },
      properties: {
        id: i.id,
        type: i.type,
        severity: i.severity,
        created_at: i.created_at,
        verified: i.verified,
      },
    })),
  }
}

export function HomeMapPage() {
  const mapRef = useRef<MapLibreMap | null>(null)
  const mapDivRef = useRef<HTMLDivElement | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selected, setSelected] = useState<Incident | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)

  const lastIncident = useMemo(() => incidents[0], [incidents])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
      const { data, error } = await supabase
        .from('incidents')
        .select('id,type,severity,description,lat,lng,created_at,verified')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500)
      if (cancelled) return
      if (!error && data) setIncidents(data as any)
    }
    load()

    const channel = supabase
      .channel('incidents-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        () => load(),
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!mapDivRef.current) return
    const style = mapStyleUrl()
    if (!style) return

    const map = new maplibregl.Map({
      container: mapDivRef.current,
      style,
      center: [77.5946, 12.9716], // default to Bangalore; user location will override
      zoom: 11,
    })
    mapRef.current = map

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', async () => {
      map.addSource('incidents', {
        type: 'geojson',
        data: incidentsToGeoJson([]),
      })

      map.addLayer({
        id: 'incidents-heat',
        type: 'heatmap',
        source: 'incidents',
        maxzoom: 15,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'severity'], 1, 0.2, 5, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 2.6],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 18, 15, 40],
          'heatmap-opacity': 0.55,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(0,0,0,0)',
            0.2,
            'rgba(236,72,153,0.2)',
            0.4,
            'rgba(236,72,153,0.4)',
            0.6,
            'rgba(244,63,94,0.55)',
            0.8,
            'rgba(251,146,60,0.6)',
            1,
            'rgba(250,204,21,0.7)',
          ],
        },
      })

      map.addLayer({
        id: 'incidents-points',
        type: 'circle',
        source: 'incidents',
        minzoom: 11,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, 15, 7],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'severity'],
            1,
            'rgba(236,72,153,0.8)',
            3,
            'rgba(244,63,94,0.85)',
            5,
            'rgba(250,204,21,0.9)',
          ],
          'circle-stroke-color': 'rgba(255,255,255,0.35)',
          'circle-stroke-width': 1,
        },
      })

      map.on('click', 'incidents-points', (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined
        if (!id) return
        const incident = incidents.find((x) => x.id === id) ?? null
        setSelected(incident)
      })

      try {
        const pos = await getCurrentPosition()
        map.easeTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          duration: 900,
        })
      } catch {
        // ignore
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const src = map.getSource('incidents') as GeoJSONSource | undefined
    if (!src) return
    src.setData(incidentsToGeoJson(incidents))
  }, [incidents])

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
            <CardTitle className="flex items-center gap-2">
              Safety Heatmap <Badge>{incidents.length} reports</Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Live community reports (no seeded data).
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setQuickOpen(true)}>
              Quick
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={centerOnMe}
              leftIcon={<LocateFixed className="h-4 w-4" />}
            >
              Me
            </Button>
          </div>
        </div>
      </Card>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        <div ref={mapDivRef} className="h-[52vh] w-full" />

        <div className="pointer-events-none absolute inset-x-0 top-0 p-3">
          <div
            className={cn(
              'pointer-events-auto rounded-2xl border px-3 py-2 backdrop-blur',
              lastIncident
                ? 'border-amber-400/25 bg-amber-500/10'
                : 'border-white/10 bg-black/30',
            )}
          >
            {lastIncident ? (
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-200" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    Latest: {lastIncident.type} • Sev {lastIncident.severity}/5
                  </div>
                  <div className="text-xs text-amber-100/80">
                    {formatRelative(lastIncident.created_at)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-zinc-300">
                No reports yet. Be the first to report something suspicious.
              </div>
            )}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="grid grid-cols-2 gap-2">
            <Link to="/journey">
              <Button className="w-full" leftIcon={<Navigation className="h-4 w-4" />}>
                Safe Journey
              </Button>
            </Link>
            <Link to="/report">
              <Button variant="secondary" className="w-full">
                Report
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {selected ? (
        <Card className="border-amber-400/25 bg-amber-500/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>
                {selected.type} • Sev {selected.severity}/5
              </CardTitle>
              <CardDescription className="mt-1">
                {selected.description || 'No details'} • {formatRelative(selected.created_at)}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        </Card>
      ) : null}

      <QuickReportModal open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  )
}
