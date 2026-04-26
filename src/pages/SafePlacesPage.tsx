import { ArrowLeft, Compass, Hospital, LocateFixed, MapPin, ShieldAlert, Store } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { MUMBAI_SAFE_PLACES } from '../lib/demoData'
import { getCurrentPosition } from '../lib/location'

type Place = {
  id: string
  name: string
  address: string
  center: [number, number]
}

const CATEGORIES: Array<{
  key: string
  label: string
  amenity: string
  icon: React.ReactNode
}> = [
  { key: 'police', label: 'Police', amenity: 'police', icon: <ShieldAlert className="h-4 w-4" /> },
  { key: 'hospital', label: 'Hospital', amenity: 'hospital', icon: <Hospital className="h-4 w-4" /> },
  { key: 'pharmacy', label: 'Pharmacy', amenity: 'pharmacy', icon: <Store className="h-4 w-4" /> },
  { key: 'fire', label: 'Fire', amenity: 'fire_station', icon: <Compass className="h-4 w-4" /> },
]

async function searchNearbyAmenities(amenity: string, proximity: [number, number]) {
  const [lon, lat] = proximity
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="${amenity}"](around:5000,${lat},${lon});
      way["amenity"="${amenity}"](around:5000,${lat},${lon});
      relation["amenity"="${amenity}"](around:5000,${lat},${lon});
    );
    out center 12;
  `
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: query,
    })
    if (!res.ok) return []
    const json = await res.json()
    return (json.elements ?? [])
      .map(
        (el: {
          type: string
          id: number
          center?: { lon: number; lat: number }
          lon?: number
          lat?: number
          tags?: { name?: string; 'addr:full'?: string; 'addr:street'?: string }
        }) => {
          const center = el.center
            ? [el.center.lon, el.center.lat]
            : typeof el.lon === 'number' && typeof el.lat === 'number'
              ? [el.lon, el.lat]
              : null
          if (!center) return null
          const name = el?.tags?.name ?? amenity.replace('_', ' ')
          return {
            id: `${el.type}-${el.id}` as string,
            name,
            address: el?.tags?.['addr:full'] ?? el?.tags?.['addr:street'] ?? 'Nearby',
            center: center as [number, number],
          } as Place
        },
      )
      .filter((p: Place | null): p is Place => Boolean(p))
  } catch {
    return []
  }
}

export function SafePlacesPage() {
  const { t } = useTranslation()
  const [category, setCategory] = useState(CATEGORIES[0].key)
  const [pos, setPos] = useState<[number, number] | null>(null) // [lon,lat]
  const [places, setPlaces] = useState<Place[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const current = useMemo(() => CATEGORIES.find((c) => c.key === category)!, [category])

  async function locate() {
    setBusy(true)
    setStatus(null)
    try {
      const p = await getCurrentPosition()
      setPos([p.coords.longitude, p.coords.latitude])
    } catch {
      // Fallback to Mumbai center in demo mode so list always appears.
      setPos([72.8777, 19.076])
      setStatus(t('safePlaces.demoLocation', { defaultValue: 'Using demo location: Mumbai' }))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!pos) return
      setBusy(true)
      setStatus(null)
      try {
        const c = CATEGORIES.find((x) => x.key === category)!
        const apiData = (await searchNearbyAmenities(c.amenity, pos)).slice(0, 12)
        const demoData = MUMBAI_SAFE_PLACES
          .filter((p) => p.type === c.amenity)
          .map((p) => ({
            id: p.id,
            name: p.name,
            address: p.address ?? 'Mumbai',
            center: [p.lng, p.lat] as [number, number],
          }))
        const data = (apiData.length ? apiData : demoData).slice(0, 12)
        if (!cancelled) setPlaces(data)
      } catch {
        if (!cancelled) setStatus('Failed to load places')
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [category, pos])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link to="/app/journey" className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <ArrowLeft className="h-4 w-4" /> {t('common.back', { defaultValue: 'Back' })}
        </Link>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          leftIcon={<LocateFixed className="h-4 w-4" />}
          onClick={locate}
        >
          {t('common.update', { defaultValue: 'Update' })}
        </Button>
      </div>

      <Card>
        <CardTitle>{t('safePlaces.title', { defaultValue: 'Nearby safe places' })}</CardTitle>
        <CardDescription className="mt-1">
          {t('safePlaces.subtitle', { defaultValue: 'Live OpenStreetMap data near your location.' })}
        </CardDescription>
      </Card>

      <div className="grid grid-cols-4 gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={[
              'rounded-xl border px-2 py-2 text-xs font-semibold',
              c.key === category
                ? 'border-pink-300/30 bg-pink-500/15 text-zinc-100'
                : 'border-white/10 bg-black/20 text-zinc-300 hover:bg-white/5',
            ].join(' ')}
            onClick={() => setCategory(c.key)}
          >
            <div className="mx-auto grid h-7 w-7 place-items-center rounded-lg bg-white/5 ring-1 ring-white/10">
              {c.icon}
            </div>
            <div className="mt-1">{c.label}</div>
          </button>
        ))}
      </div>

      <Card className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          {t('safePlaces.resultsTitle', { defaultValue: 'Results' })}{' '}
          <span className="text-zinc-400">({current.label})</span>
        </CardTitle>
        <CardDescription>
          {t('safePlaces.resultsSubtitle', {
            defaultValue: 'Tap a place to start navigation (opens AR Navigation UI).',
          })}
        </CardDescription>
        {status ? <div className="text-sm text-zinc-200">{status}</div> : null}
        <div className="mt-2 space-y-2">
          {places.length ? (
            places.map((p) => (
              <Link
                key={p.id}
                to={`/app/ar?dest=${encodeURIComponent(p.address)}&lon=${p.center[0]}&lat=${p.center[1]}`}
              >
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 hover:bg-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <MapPin className="h-4 w-4 text-zinc-300" />
                        <span className="truncate">{p.name}</span>
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">{p.address}</div>
                    </div>
                    <div className="text-xs text-zinc-300">
                      {t('safePlaces.navigate', { defaultValue: 'Navigate' })}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-sm text-zinc-400">
              {busy
                ? t('safePlaces.loading', { defaultValue: 'Loading...' })
                : t('safePlaces.noResults', { defaultValue: 'No results.' })}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
