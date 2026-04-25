import { ArrowLeft, BellRing, Users2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Switch } from '../components/ui/Switch'
import { getPref, setPref } from '../lib/prefs'

type Prefs = {
  allowNearbyAlerts: boolean
  shareApproxLocation: boolean
}

const DEFAULTS: Prefs = {
  allowNearbyAlerts: true,
  shareApproxLocation: false,
}

export function NearbyUsersPage() {
  const [p, setP] = useState<Prefs>(DEFAULTS)
  const [status, setStatus] = useState<string | null>(null)

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
          UI for community alerts (“nearby users notified”). Backend delivery (push/SMS) is wired later.
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
          Demo alert broadcast <BellRing className="h-4 w-4 text-zinc-300" />
        </CardTitle>
        <CardDescription>UI-only preview of the experience.</CardDescription>
        {status ? <div className="text-sm text-zinc-200">{status}</div> : null}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={() => setStatus('Simulated: 0 nearby users available right now.')}
          >
            Check nearby
          </Button>
          <Button onClick={() => setStatus('Simulated: Alert broadcast queued (push/SMS wiring pending).')}>
            Broadcast
          </Button>
        </div>
      </Card>
    </div>
  )
}

