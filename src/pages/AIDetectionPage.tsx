import { ArrowLeft, BrainCircuit, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Switch } from '../components/ui/Switch'
import { getPref, setPref } from '../lib/prefs'

type Settings = {
  enabled: boolean
  stepDeviationMeters: number
  noResponseSeconds: number
  partyMovement: boolean
  sensitivity: number
}

const DEFAULTS: Settings = {
  enabled: true,
  stepDeviationMeters: 80,
  noResponseSeconds: 25,
  partyMovement: true,
  sensitivity: 3,
}

export function AIDetectionPage() {
  const [s, setS] = useState<Settings>(DEFAULTS)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setS(await getPref('ai_detection', DEFAULTS))
    })()
  }, [])

  async function save(next: Settings) {
    setS(next)
    await setPref('ai_detection', next)
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
          AI Danger Detection <BrainCircuit className="h-4 w-4 text-zinc-300" />
        </CardTitle>
        <CardDescription className="mt-1">
          Detection rules used by live Safe Journey monitoring (deviation, acceleration, stops, no-response).
        </CardDescription>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Enable detection</div>
            <div className="text-xs text-zinc-400">Runs during Safe Journey monitoring</div>
          </div>
          <Switch checked={s.enabled} onCheckedChange={(v) => void save({ ...s, enabled: v })} />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-zinc-300">Step deviation threshold</div>
            <div className="text-xs text-zinc-400">{s.stepDeviationMeters} m</div>
          </div>
          <input
            type="range"
            min={20}
            max={250}
            step={10}
            value={s.stepDeviationMeters}
            onChange={(e) => void save({ ...s, stepDeviationMeters: Number(e.target.value) })}
            className="w-full accent-pink-400"
            disabled={!s.enabled}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-zinc-300">No-response timeout</div>
            <div className="text-xs text-zinc-400">{s.noResponseSeconds}s</div>
          </div>
          <input
            type="range"
            min={10}
            max={90}
            step={5}
            value={s.noResponseSeconds}
            onChange={(e) => void save({ ...s, noResponseSeconds: Number(e.target.value) })}
            className="w-full accent-pink-400"
            disabled={!s.enabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Party movement detection</div>
            <div className="text-xs text-zinc-400">Detect unusual group movement patterns</div>
          </div>
          <Switch
            checked={s.partyMovement}
            onCheckedChange={(v) => void save({ ...s, partyMovement: v })}
            disabled={!s.enabled}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-zinc-300">Sensitivity</div>
            <div className="text-xs text-zinc-400">{s.sensitivity}/5</div>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={s.sensitivity}
            onChange={(e) => void save({ ...s, sensitivity: Number(e.target.value) })}
            className="w-full accent-pink-400"
            disabled={!s.enabled}
          />
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle className="flex items-center gap-2">
          Test & calibration <ShieldAlert className="h-4 w-4 text-zinc-300" />
        </CardTitle>
        <CardDescription>
          Test triggers for calibration; live risk scoring now runs in Safe Journey mode.
        </CardDescription>
        {status ? <div className="text-sm text-zinc-200">{status}</div> : null}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setStatus(null)
              try {
                await new Promise((r) => setTimeout(r, 600))
                setStatus('Simulated: step deviation detected → would prompt check-in.')
              } finally {
                setBusy(false)
              }
            }}
          >
            Simulate deviation
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setStatus(null)
              try {
                await new Promise((r) => setTimeout(r, 600))
                setStatus('Simulated: no-response escalation → would trigger SOS Level 1.')
              } finally {
                setBusy(false)
              }
            }}
          >
            Simulate escalation
          </Button>
        </div>
      </Card>
    </div>
  )
}

