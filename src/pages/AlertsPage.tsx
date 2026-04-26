import { LocateFixed, ShieldAlert, ShieldPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { MUMBAI_SAFE_PLACES, getDemoIncidents, maybeGenerateDemoIncident } from '../lib/demoData'
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
  const { t } = useTranslation()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [usingDemo, setUsingDemo] = useState(false)

  async function refresh() {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
    const { data, error } = await supabase
      .from('incidents')
      .select('id,type,severity,description,lat,lng,created_at,verified')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500)
    if (!error && data && data.length) {
      setIncidents(data as Incident[])
      setUsingDemo(false)
      return
    }
    maybeGenerateDemoIncident()
    setIncidents(getDemoIncidents())
    setUsingDemo(true)
  }

  useEffect(() => {
    void refresh()
    void locate()
    const channel = supabase
      .channel('incidents-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, refresh)
      .subscribe()
    const t = window.setInterval(() => {
      void refresh()
    }, 20_000)
    return () => {
      supabase.removeChannel(channel)
      window.clearInterval(t)
    }
  }, [])

  async function locate() {
    setBusy(true)
    try {
      const p = await getCurrentPosition()
      setPos({ lat: p.coords.latitude, lng: p.coords.longitude })
    } catch {
      setPos({ lat: 19.076, lng: 72.8777 }) // Mumbai center demo fallback
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

  const nearbySafePlaces = useMemo(() => {
    if (!pos) return []
    return MUMBAI_SAFE_PLACES
      .map((p) => ({
        ...p,
        dist: haversineMeters(pos.lat, pos.lng, p.lat, p.lng),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 4)
  }, [pos])

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              {t('alerts.title', { defaultValue: 'Real-time Alerts' })}{' '}
              <Badge>
                {t('alerts.totalCount', {
                  defaultValue: '{{count}} total',
                  count: incidents.length,
                })}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              {t('alerts.subtitle', {
                defaultValue: 'Based on live community reports near your current location.',
              })}
              {usingDemo
                ? ` ${t('alerts.demoStream', {
                    defaultValue: 'Demo stream active with simulated Mumbai activity.',
                  })}`
                : ''}
            </CardDescription>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={locate}
            disabled={busy}
            leftIcon={<LocateFixed className="h-4 w-4" />}
          >
            {pos
              ? t('common.update', { defaultValue: 'Update' })
              : t('alerts.locate', { defaultValue: 'Locate' })}
          </Button>
        </div>
      </Card>

      {pos ? (
        <Card className="border-amber-400/20 bg-amber-500/10">
          <CardTitle>High-risk nearby</CardTitle>
          <CardDescription className="mt-1">
            {t('alerts.highRiskSubtitle', { defaultValue: 'Severity >= 4 within ~1.2km (live).' })}
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
                  <div className="text-xs text-zinc-300">
                    {incident.verified ? t('alerts.verified', { defaultValue: 'verified' }) : ''}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-300">
                {t('alerts.noHighRisk', { defaultValue: 'No high-risk reports nearby.' })}
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <CardTitle>{t('alerts.enableTitle', { defaultValue: 'Enable alerts' })}</CardTitle>
          <CardDescription className="mt-1">
            {t('alerts.enableSubtitle', { defaultValue: 'Tap Locate to see nearby risk alerts.' })}
          </CardDescription>
        </Card>
      )}

      <Card className="space-y-2">
        <CardTitle>{t('alerts.safePlacesTitle', { defaultValue: 'Nearby safe places' })}</CardTitle>
        <CardDescription>
          {t('alerts.safePlacesSubtitle', { defaultValue: 'Closest verified support points around you.' })}
        </CardDescription>
        <div className="mt-2 space-y-2">
          {nearbySafePlaces.length ? (
            nearbySafePlaces.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-zinc-400">
                    {p.type.replace('_', ' ')} • {metersToText(p.dist)}
                  </div>
                </div>
                <div className="text-xs text-zinc-300">
                  {t('alerts.safe', { defaultValue: 'safe' })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-zinc-400">
              {t('alerts.safePlacesLocationNeeded', {
                defaultValue: 'Location needed to show safe places.',
              })}
            </div>
          )}
        </div>
        <Link to="/app/safe-places">
          <Button variant="secondary" className="w-full" leftIcon={<ShieldPlus className="h-4 w-4" />}>
            {t('alerts.openSafePlaces', { defaultValue: 'Open full safe places list' })}
          </Button>
        </Link>
      </Card>

      <Card className="space-y-2">
        <CardTitle>{t('alerts.nearbyReportsTitle', { defaultValue: 'Nearby reports' })}</CardTitle>
        <CardDescription>
          {t('alerts.nearbyReportsSubtitle', {
            defaultValue: 'Sorted by distance from your current position.',
          })}
        </CardDescription>
        <div className="mt-2 space-y-2">
          {!pos ? (
            <div className="text-sm text-zinc-400">
              {t('alerts.locationNotSet', { defaultValue: 'Location not set yet.' })}
            </div>
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
                <div className="text-xs text-zinc-400">
                  {incident.verified ? t('alerts.verified', { defaultValue: 'verified' }) : ''}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-zinc-400">
              {t('alerts.noReportsFound', { defaultValue: 'No reports found.' })}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

