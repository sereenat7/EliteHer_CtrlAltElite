import { ArrowLeft, EyeOff, Hand, Siren } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Switch } from '../components/ui/Switch'
import { getPref, setPref } from '../lib/prefs'

type HiddenPrefs = {
  enabled: boolean
  silentHaptics: boolean
  tripleTapHeaderSos: boolean
  longPressSos: boolean
}

const DEFAULTS: HiddenPrefs = {
  enabled: true,
  silentHaptics: true,
  tripleTapHeaderSos: true,
  longPressSos: true,
}

export function HiddenModePage() {
  const [p, setP] = useState<HiddenPrefs>(DEFAULTS)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => setP(await getPref('hidden_mode', DEFAULTS)))()
  }, [])

  async function save(next: HiddenPrefs) {
    setP(next)
    await setPref('hidden_mode', next)
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
          Hidden mode <EyeOff className="h-4 w-4 text-zinc-300" />
        </CardTitle>
        <CardDescription className="mt-1">
          Stealth UI patterns: silent triggers, minimal UI, and discreet actions.
        </CardDescription>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Enable hidden mode</div>
            <div className="text-xs text-zinc-400">Makes SOS harder to notice</div>
          </div>
          <Switch checked={p.enabled} onCheckedChange={(v) => void save({ ...p, enabled: v })} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Silent haptics</div>
            <div className="text-xs text-zinc-400">Haptic feedback instead of audio</div>
          </div>
          <Switch
            checked={p.silentHaptics}
            onCheckedChange={(v) => void save({ ...p, silentHaptics: v })}
            disabled={!p.enabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Triple-tap header → SOS</div>
            <div className="text-xs text-zinc-400">Hidden gesture in the top bar</div>
          </div>
          <Switch
            checked={p.tripleTapHeaderSos}
            onCheckedChange={(v) => void save({ ...p, tripleTapHeaderSos: v })}
            disabled={!p.enabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Long-press anywhere → SOS</div>
            <div className="text-xs text-zinc-400">Discreet hold gesture</div>
          </div>
          <Switch
            checked={p.longPressSos}
            onCheckedChange={(v) => void save({ ...p, longPressSos: v })}
            disabled={!p.enabled}
          />
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle className="flex items-center gap-2">
          Test gestures <Hand className="h-4 w-4 text-zinc-300" />
        </CardTitle>
        <CardDescription>UI test only (does not trigger real emergency calls).</CardDescription>
        {status ? <div className="text-sm text-zinc-200">{status}</div> : null}
        <Button
          variant="secondary"
          className="w-full"
          leftIcon={<Siren className="h-4 w-4" />}
          onClick={() => setStatus('Gesture detected (simulated) → would open SOS escalation.')}
        >
          Simulate hidden SOS
        </Button>
      </Card>
    </div>
  )
}

