import { ArrowLeft, PhoneCall, Send, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Input, Textarea } from '../components/ui/Input'
import { getPref, setPref } from '../lib/prefs'

type Prefs = {
  emergencyNumber: string
  smsFallbackNumber: string
  smsTemplate: string
}

const DEFAULTS: Prefs = {
  emergencyNumber: '112',
  smsFallbackNumber: '',
  smsTemplate: 'SOS: I need help. My location is being shared in Saaya.',
}

export function EmergencyPage() {
  const [p, setP] = useState<Prefs>(DEFAULTS)

  useEffect(() => {
    ;(async () => setP(await getPref('emergency', DEFAULTS)))()
  }, [])

  async function save(next: Prefs) {
    setP(next)
    await setPref('emergency', next)
  }

  function callNumber(n: string) {
    const num = n.trim()
    if (!num) return
    window.location.href = `tel:${encodeURIComponent(num)}`
  }

  function smsNumber(n: string, body: string) {
    const num = n.trim()
    if (!num) return
    // SMS URI support depends on platform.
    window.location.href = `sms:${encodeURIComponent(num)}?body=${encodeURIComponent(body)}`
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
          Emergency calling + SMS fallback <ShieldAlert className="h-4 w-4 text-zinc-300" />
        </CardTitle>
        <CardDescription className="mt-1">
          UI for emergency actions. On mobile, buttons open the dialer / SMS composer.
        </CardDescription>
      </Card>

      <Card className="space-y-3">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-zinc-300">Emergency number</div>
          <Input
            value={p.emergencyNumber}
            onChange={(e) => void save({ ...p, emergencyNumber: e.target.value })}
            placeholder="112"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            className="w-full"
            variant="danger"
            leftIcon={<PhoneCall className="h-4 w-4" />}
            onClick={() => callNumber(p.emergencyNumber)}
          >
            Call {p.emergencyNumber || '—'}
          </Button>
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => callNumber('112')}
          >
            Call 112
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>SMS fallback</CardTitle>
        <CardDescription>
          Configure a fallback number (e.g., a guardian phone or hotline). Twilio automation is wired later.
        </CardDescription>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-zinc-300">SMS number</div>
          <Input
            value={p.smsFallbackNumber}
            onChange={(e) => void save({ ...p, smsFallbackNumber: e.target.value })}
            placeholder="+14155552671"
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-zinc-300">Message template</div>
          <Textarea
            value={p.smsTemplate}
            onChange={(e) => void save({ ...p, smsTemplate: e.target.value })}
          />
        </div>

        <Button
          variant="secondary"
          className="w-full"
          leftIcon={<Send className="h-4 w-4" />}
          disabled={!p.smsFallbackNumber.trim()}
          onClick={() => smsNumber(p.smsFallbackNumber, p.smsTemplate)}
        >
          Compose SMS
        </Button>
      </Card>
    </div>
  )
}

