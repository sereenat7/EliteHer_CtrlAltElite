import { ArrowLeft, Compass, Hospital, LocateFixed, MapPin, ShieldAlert, Store } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { env } from '../lib/env'
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
  query: string
  icon: React.ReactNode
}> = [
  { key: 'police', label: 'Police', query: 'police', icon: <ShieldAlert className="h-4 w-4" /> },
  { key: 'hospital', label: 'Hospital', query: 'hospital', icon: <Hospital className="h-4 w-4" /> },
  { key: 'pharmacy', label: 'Pharmacy', query: 'pharmacy', icon: <Store className="h-4 w-4" /> },
  { key: 'metro', label: 'Transit', query: 'metro station', icon: <Compass className="h-4 w-4" /> },
]

async function geocodePoi(q: string, proximity?: [number, number]) {
  if (!env.maptilerKey) return []
  const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json`)
  url.searchParams.set('key', env.maptilerKey)
  url.searchParams.set('limit', '8')
  url.searchParams.set('autocomplete', 'true')
  if (proximity) url.searchParams.set('proximity', `${proximity[0]},${proximity[1]}`)
  // Prefer POIs when possible
  url.searchParams.set('types', 'poi')

  const res = await fetch(url.toString())
  if (!res.ok) return []
  const json = await res.json()
  return (json.features ?? []).map((f: any) => ({
    id: f.id as string,
    name: (f.text as string) ?? (f.place_name as string),
    address: f.place_name as string,
    center: f.center as [number, number],
  })) as Place[]
}

export function SafePlacesPage() {
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
    } catch (e: any) {
      setStatus(e?.message ?? 'Failed to get location')
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
        const data = await geocodePoi(c.query, pos)
        if (!cancelled) setPlaces(data)
      } catch (e: any) {
        if (!cancelled) setStatus(e?.message ?? 'Failed to load places')
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
        <Link to="/journey" className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          leftIcon={<LocateFixed className="h-4 w-4" />}
          onClick={locate}
        >
          Update
        </Button>
      </div>

      <Card>
        <CardTitle>Nearby safe places</CardTitle>
        <CardDescription className="mt-1">
          Real POI results via MapTiler Geocoding with proximity bias.
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
          Results <span className="text-zinc-400">({current.label})</span>
        </CardTitle>
        <CardDescription>
          Tap a place to start navigation (opens AR Navigation UI).
        </CardDescription>
        {status ? <div className="text-sm text-zinc-200">{status}</div> : null}
        <div className="mt-2 space-y-2">
          {places.length ? (
            places.map((p) => (
              <Link
                key={p.id}
                to={`/ar?dest=${encodeURIComponent(p.address)}&lon=${p.center[0]}&lat=${p.center[1]}`}
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
                    <div className="text-xs text-zinc-300">Navigate</div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-sm text-zinc-400">{busy ? 'Loading…' : 'No results.'}</div>
          )}
        </div>
      </Card>
    </div>
  )
}
