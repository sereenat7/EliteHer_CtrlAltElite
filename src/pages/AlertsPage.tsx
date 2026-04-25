import { LocateFixed, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { getCurrentPosition } from '../lib/location'
import { supabase } from '../lib/supabase'
import { formatRelative } from '../lib/utils'

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

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function metersToText(m: number) {
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(1)} km`
}

export function AlertsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
    const { data } = await supabase
      .from('incidents')
      .select('id,type,severity,description,lat,lng,created_at,verified')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500)
    setIncidents((data as any) ?? [])
  }

  useEffect(() => {
    refresh()
    const channel = supabase
      .channel('incidents-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, refresh)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function locate() {
    setBusy(true)
    try {
      const p = await getCurrentPosition()
      setPos({ lat: p.coords.latitude, lng: p.coords.longitude })
    } finally {
      setBusy(false)
    }
  }

  const nearby = useMemo(() => {
    if (!pos) return []
    const withDist = incidents.map((i) => ({
      incident: i,
      dist: haversineMeters(pos.lat, pos.lng, i.lat, i.lng),
    }))
    return withDist.sort((a, b) => a.dist - b.dist).slice(0, 30)
  }, [incidents, pos])

  const highRisk = useMemo(
    () => nearby.filter((x) => x.incident.severity >= 4 && x.dist <= 1200).slice(0, 6),
    [nearby],
  )

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              Real-time Alerts <Badge>{incidents.length} total</Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Based on live community reports near your current location.
            </CardDescription>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={locate}
            disabled={busy}
            leftIcon={<LocateFixed className="h-4 w-4" />}
          >
            {pos ? 'Update' : 'Locate'}
          </Button>
        </div>
      </Card>

      {pos ? (
        <Card className="border-amber-400/20 bg-amber-500/10">
          <CardTitle>High-risk nearby</CardTitle>
          <CardDescription className="mt-1">
            Severity ≥ 4 within ~1.2km (live).
          </CardDescription>
          <div className="mt-3 space-y-2">
            {highRisk.length ? (
              highRisk.map(({ incident, dist }) => (
                <div
                  key={incident.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <ShieldAlert className="h-4 w-4 text-amber-200" />
                      <span className="truncate">
                        {incident.type} • Sev {incident.severity}/5
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {metersToText(dist)} • {formatRelative(incident.created_at)}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-300">{incident.verified ? 'verified' : ''}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-300">No high-risk reports nearby.</div>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <CardTitle>Enable alerts</CardTitle>
          <CardDescription className="mt-1">
            Tap Locate to see nearby risk alerts.
          </CardDescription>
        </Card>
      )}

      <Card className="space-y-2">
        <CardTitle>Nearby reports</CardTitle>
        <CardDescription>
          Sorted by distance (requires location). Uses real data—no mock entries.
        </CardDescription>
        <div className="mt-2 space-y-2">
          {!pos ? (
            <div className="text-sm text-zinc-400">Location not set yet.</div>
          ) : nearby.length ? (
            nearby.map(({ incident, dist }) => (
              <div
                key={incident.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-semibold">
                    {incident.type} • Sev {incident.severity}/5
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {metersToText(dist)} • {formatRelative(incident.created_at)}
                    {incident.description ? ` • ${incident.description}` : ''}
                  </div>
                </div>
                <div className="text-xs text-zinc-400">{incident.verified ? 'verified' : ''}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-zinc-400">No reports found.</div>
          )}
        </div>
      </Card>
    </div>
  )
}

