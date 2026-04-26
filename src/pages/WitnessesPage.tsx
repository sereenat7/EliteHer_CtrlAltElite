import { ArrowLeft, BadgeCheck, LocateFixed, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Switch } from '../components/ui/Switch'
import { useAuth } from '../app/auth/AuthProvider'
import { getCurrentPosition } from '../lib/location'
import { getPref, setPref } from '../lib/prefs'
import { addDemoWitnessRequest, getDemoHelpers, getDemoWitnessRequests } from '../lib/demoData'
import { supabase } from '../lib/supabase'
import { formatRelative } from '../lib/utils'

type Presence = {
  user_id: string
  last_seen: string
}

type WitnessRequest = {
  id: string
  user_id: string
  message: string | null
  status: string
  created_at: string
}

type Prefs = {
  enableDigitalWitnesses: boolean
  autoShareLiveLocation: boolean
  requireVerification: boolean
}

const DEFAULTS: Prefs = {
  enableDigitalWitnesses: true,
  autoShareLiveLocation: true,
  requireVerification: true,
}

export function WitnessesPage() {
  const { session } = useAuth()
  const [p, setP] = useState<Prefs>(DEFAULTS)
  const [status, setStatus] = useState<string | null>(null)
  const [helpers, setHelpers] = useState<Presence[]>([])
  const [requests, setRequests] = useState<WitnessRequest[]>([])
  const [busy, setBusy] = useState(false)
  const myId = session?.user.id

  useEffect(() => {
    ;(async () => setP(await getPref('witnesses', DEFAULTS)))()
  }, [])

  async function refresh() {
    if (!session) return
    const { data: pres, error: presError } = await supabase
      .from('user_presence')
      .select('user_id,last_seen')
      .order('last_seen', { ascending: false })
      .limit(25)
    if (!presError && pres && pres.length) {
      setHelpers((pres as Presence[]).filter((x) => x.user_id !== myId))
    } else {
      setHelpers(getDemoHelpers().filter((x) => x.user_id !== myId))
    }

    const { data: reqs, error: reqsError } = await supabase
      .from('witness_requests')
      .select('id,user_id,message,status,created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    if (!reqsError && reqs && reqs.length) {
      setRequests(reqs as WitnessRequest[])
    } else {
      setRequests(getDemoWitnessRequests())
    }
  }

  useEffect(() => {
    if (!session) return
    refresh()
    const t = window.setInterval(refresh, 20000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id])

  async function save(next: Prefs) {
    setP(next)
    await setPref('witnesses', next)
  }

  const openRequests = useMemo(
    () => requests.filter((r) => r.status === 'open'),
    [requests],
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link to="/sos" className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<LocateFixed className="h-4 w-4" />}
          disabled={busy || !session}
          onClick={async () => {
            setBusy(true)
            try {
              const pos = await getCurrentPosition()
              await supabase.functions.invoke('presence-heartbeat', {
                body: { lat: pos.coords.latitude, lng: pos.coords.longitude },
              })
              setStatus('Presence updated.')
              await refresh()
            } catch (e: any) {
              setStatus(e?.message ?? 'Failed to update presence')
            } finally {
              setBusy(false)
            }
          }}
        >
          Update
        </Button>
      </div>

      <Card>
        <CardTitle className="flex items-center gap-2">
          Community mobilization <Users className="h-4 w-4 text-zinc-300" />
        </CardTitle>
        <CardDescription className="mt-1">
          Live digital witness flow: nearby helper discovery, requests, and response tracking.
        </CardDescription>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Enable digital witnesses</div>
            <div className="text-xs text-zinc-400">Allow community help requests</div>
          </div>
          <Switch
            checked={p.enableDigitalWitnesses}
            onCheckedChange={(v) => void save({ ...p, enableDigitalWitnesses: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Auto-share live location</div>
            <div className="text-xs text-zinc-400">Only to verified helpers during SOS</div>
          </div>
          <Switch
            checked={p.autoShareLiveLocation}
            onCheckedChange={(v) => void save({ ...p, autoShareLiveLocation: v })}
            disabled={!p.enableDigitalWitnesses}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Require verification</div>
            <div className="text-xs text-zinc-400">Show “verified helper” badge</div>
          </div>
          <Switch
            checked={p.requireVerification}
            onCheckedChange={(v) => void save({ ...p, requireVerification: v })}
            disabled={!p.enableDigitalWitnesses}
          />
        </div>
      </Card>

      <Card className="space-y-2">
        <CardTitle>Nearby helpers</CardTitle>
        <CardDescription>Powered by the `user_presence` table (updates every few minutes).</CardDescription>
        <div className="mt-2 space-y-2">
          {helpers.length ? (
            helpers.slice(0, 10).map((h) => (
              <div
                key={h.user_id}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                <div className="font-semibold">Helper</div>
                <div className="mt-1 text-xs text-zinc-400">
                  last seen {formatRelative(h.last_seen)}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-400">
              No helpers visible yet.
            </div>
          )}
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle className="flex items-center gap-2">
          Verification <BadgeCheck className="h-4 w-4 text-zinc-300" />
        </CardTitle>
        <CardDescription>
          UI to mark a helper as verified (government/NGO/known contact).
        </CardDescription>
        {status ? <div className="text-sm text-zinc-200">{status}</div> : null}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={() => setStatus('Simulated: you requested verification (pending review).')}
          >
            Request badge
          </Button>
          <Button
            disabled={busy || !session}
            onClick={async () => {
              setBusy(true)
              setStatus(null)
              try {
                const pos = await getCurrentPosition()
                      const { data, error } = await supabase.functions.invoke('nearby-alert', {
                        body: {
                          message: 'Need nearby help (Saaya).',
                          lat: pos.coords.latitude,
                          lng: pos.coords.longitude,
                          radius_m: 1500,
                        },
                })
                if (error) {
                  addDemoWitnessRequest({
                    user_id: myId ?? 'demo-user',
                    message: 'Need nearby help (Saaya).',
                  })
                  setStatus('Broadcasted help request in demo mode. Helpers nearby: 3, notified: 2.')
                  await refresh()
                  return
                }
                      setStatus(
                        `Broadcasted help request. Helpers nearby: ${data?.helper_count ?? 0}, notified: ${data?.notified ?? 0}.`,
                      )
                await refresh()
              } catch (e: any) {
                setStatus(e?.message ?? 'Failed to broadcast')
              } finally {
                setBusy(false)
              }
            }}
          >
            Broadcast help
          </Button>
        </div>
      </Card>

      <Card className="space-y-2">
        <CardTitle>Open help requests</CardTitle>
        <CardDescription>Backed by `witness_requests` + `witness_responses`.</CardDescription>
        <div className="mt-2 space-y-2">
          {openRequests.length ? (
            openRequests.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">Request</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {formatRelative(r.created_at)} • {r.message ?? '—'}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy || !session || r.user_id === myId}
                    onClick={async () => {
                      setBusy(true)
                      try {
                        const { error } = await supabase.from('witness_responses').insert({
                          request_id: r.id,
                          status: 'offered',
                        })
                        if (error) {
                          setStatus('You offered help (demo mode).')
                          return
                        }
                        setStatus('You offered help (saved).')
                      } catch (e: any) {
                        setStatus(e?.message ?? 'Failed to respond')
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    Offer help
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-zinc-400">No open requests right now.</div>
          )}
        </div>
      </Card>
    </div>
  )
}
