import { ArrowLeft, BellRing, Users2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../app/auth/AuthProvider'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Switch } from '../components/ui/Switch'
import { getCurrentPosition } from '../lib/location'
import { getPref, setPref } from '../lib/prefs'
import { supabase } from '../lib/supabase'

type Prefs = {
  allowNearbyAlerts: boolean
  shareApproxLocation: boolean
}

const DEFAULTS: Prefs = {
  allowNearbyAlerts: true,
  shareApproxLocation: false,
}

export function NearbyUsersPage() {
  const { session } = useAuth()
  const [p, setP] = useState<Prefs>(DEFAULTS)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ;(async () => setP(await getPref('nearby_users', DEFAULTS)))()
  }, [])

  async function save(next: Prefs) {
    setP(next)
    await setPref('nearby_users', next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link to="/settings" className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <Card>
        <CardTitle className="flex items-center gap-2">
          Nearby users alerted <Users2 className="h-4 w-4 text-zinc-300" />
        </CardTitle>
        <CardDescription className="mt-1">
          Community alerts are broadcast to nearby helpers using presence + optional push delivery.
        </CardDescription>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Receive nearby alerts</div>
            <div className="text-xs text-zinc-400">Show nearby SOS/community alerts in-app</div>
          </div>
          <Switch
            checked={p.allowNearbyAlerts}
            onCheckedChange={(v) => void save({ ...p, allowNearbyAlerts: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Share approximate location</div>
            <div className="text-xs text-zinc-400">Opt-in to help others find safe helpers nearby</div>
          </div>
          <Switch
            checked={p.shareApproxLocation}
            onCheckedChange={(v) => void save({ ...p, shareApproxLocation: v })}
          />
        </div>
      </Card>

      <Card className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          Alert broadcast <BellRing className="h-4 w-4 text-zinc-300" />
        </CardTitle>
        <CardDescription>Uses real backend flow via `nearby-alert` and presence data.</CardDescription>
        {status ? <div className="text-sm text-zinc-200">{status}</div> : null}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            disabled={busy || !session}
            onClick={async () => {
              setBusy(true)
              setStatus(null)
              try {
                const pos = await getCurrentPosition()
                const { data, error } = await supabase.rpc('nearby_helpers', {
                  p_lat: pos.coords.latitude,
                  p_lng: pos.coords.longitude,
                  p_radius_m: 1500,
                })
                if (error) throw error
                const count = (data ?? []).length
                setStatus(`Found ${count} nearby helper(s) in the last 30 minutes.`)
              } catch (e: any) {
                setStatus(e?.message ?? 'Failed to check nearby helpers')
              } finally {
                setBusy(false)
              }
            }}
          >
            Check nearby
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
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    message: 'Nearby safety alert from Saaya. Tap to offer help.',
                    radius_m: 1500,
                  },
                })
                if (error) throw error
                setStatus(
                  `Broadcast created. Nearby helpers: ${data?.helper_count ?? 0}, push notified: ${data?.notified ?? 0}.`,
                )
              } catch (e: any) {
                setStatus(e?.message ?? 'Failed to broadcast nearby alert')
              } finally {
                setBusy(false)
              }
            }}
          >
            Broadcast
          </Button>
        </div>
      </Card>
    </div>
  )
}

