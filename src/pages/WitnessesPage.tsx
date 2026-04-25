import { ArrowLeft, BadgeCheck, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Switch } from '../components/ui/Switch'
import { getPref, setPref } from '../lib/prefs'

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
  const [p, setP] = useState<Prefs>(DEFAULTS)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => setP(await getPref('witnesses', DEFAULTS)))()
  }, [])

  async function save(next: Prefs) {
    setP(next)
    await setPref('witnesses', next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link to="/sos" className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <Card>
        <CardTitle className="flex items-center gap-2">
          Community mobilization <Users className="h-4 w-4 text-zinc-300" />
        </CardTitle>
        <CardDescription className="mt-1">
          UI for “digital witnesses”: invite nearby helpers, verification, and safe check-ins.
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
        <CardDescription>UI-only for now (presence + push wiring later).</CardDescription>
        <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-400">
          No helpers visible yet.
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
          <Button onClick={() => setStatus('Simulated: broadcast help request queued.')}>Broadcast help</Button>
        </div>
      </Card>
    </div>
  )
}

