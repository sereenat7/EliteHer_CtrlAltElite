import { ArrowLeft, BellRing, CheckCircle2, Clock, PhoneCall, ShieldAlert, Siren } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { supabase } from '../lib/supabase'
import { createDemoSosEvent, updateDemoSosEvent } from '../lib/demoData'

type LogItem = { ts: string; text: string }

export function SosEscalationPage() {
  const [params] = useSearchParams()
  const initialId = params.get('id')

  const [eventId, setEventId] = useState<string | null>(initialId)
  const [level, setLevel] = useState(1)
  const [status, setStatus] = useState<'idle' | 'running' | 'ack' | 'resolved'>('idle')
  const [secondsLeft, setSecondsLeft] = useState(25)
  const [log, setLog] = useState<LogItem[]>([])
  const [busy, setBusy] = useState(false)

  const steps = useMemo(
    () => [
      { n: 1, title: 'Level 1', desc: 'Deterrence + evidence capture + live share UI' },
      { n: 2, title: 'Level 2', desc: 'Notify trusted contacts (push/SMS wiring later)' },
      { n: 3, title: 'Level 3', desc: 'Emergency call (112) + SMS fallback UI' },
    ],
    [],
  )

  useEffect(() => {
    if (status !== 'running') return
    if (secondsLeft <= 0) return
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [status, secondsLeft])

  useEffect(() => {
    if (status !== 'running') return
    if (secondsLeft > 0) return
    // auto-escalate
    void escalate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, status])

  function pushLog(text: string) {
    setLog((l) => [{ ts: new Date().toISOString(), text }, ...l].slice(0, 50))
  }

  async function ensureEvent() {
    if (eventId) return eventId
    if (!navigator.onLine) {
      const demo = createDemoSosEvent(1)
      setEventId(demo.id)
      pushLog('Offline: SOS event created in demo mode.')
      return demo.id
    }
    const { data, error } = await supabase.from('sos_events').insert({ level: 1, status: 'triggered' }).select('id').single()
    if (error) {
      const demo = createDemoSosEvent(1)
      setEventId(demo.id)
      pushLog('Backend unavailable: SOS event created in demo mode.')
      return demo.id
    }
    setEventId(data.id)
    pushLog('Created SOS event.')
    return data.id as string
  }

  async function start() {
    setBusy(true)
    try {
      const id = await ensureEvent()
      setLevel(1)
      setSecondsLeft(25)
      setStatus('running')
      pushLog('Escalation started (Level 1).')
      if (id) {
        try {
          await supabase.functions.invoke('sos-escalate', { body: { sos_event_id: id } })
          pushLog('Backend: sos-escalate invoked.')
        } catch {
          pushLog('Backend: sos-escalate not available (deploy functions + set secrets).')
        }
      }
    } finally {
      setBusy(false)
    }
  }

  async function escalate() {
    if (busy) return
    setBusy(true)
    try {
      const next = Math.min(3, level + 1)
      setLevel(next)
      setSecondsLeft(next === 2 ? 20 : 15)
      pushLog(`Auto-escalated to Level ${next}.`)
      if (eventId) {
        const { error } = await supabase
          .from('sos_events')
          .update({ level: next, status: 'triggered' })
          .eq('id', eventId)
        if (error) updateDemoSosEvent(eventId, { level: next, status: 'triggered' })
        // Backend: call Edge Function to perform escalation actions (SMS/push + audit log).
        try {
          await supabase.functions.invoke('sos-escalate', { body: { sos_event_id: eventId } })
          pushLog('Backend: sos-escalate invoked.')
        } catch {
          pushLog('Backend: sos-escalate not available (deploy functions + set secrets).')
        }
      }
      if (next === 3) {
        setStatus('running')
        pushLog('Level 3 reached: show emergency call + SMS fallback UI.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function acknowledge() {
    setStatus('ack')
    pushLog('Acknowledged by user/helper (UI).')
    if (eventId) {
      const { error } = await supabase
        .from('sos_events')
        .update({ status: 'acknowledged' })
        .eq('id', eventId)
      if (error) updateDemoSosEvent(eventId, { status: 'acknowledged' })
    }
  }

  async function resolve() {
    setStatus('resolved')
    pushLog('Resolved (UI).')
    if (eventId) {
      const { error } = await supabase.from('sos_events').update({ status: 'resolved' }).eq('id', eventId)
      if (error) updateDemoSosEvent(eventId, { status: 'resolved' })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link to="/app/sos" className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        {eventId ? <Badge>event {eventId.slice(0, 6)}</Badge> : <Badge>no event</Badge>}
      </div>

      <Card>
        <CardTitle className="flex items-center gap-2">
          SOS escalation engine (UI) <Siren className="h-4 w-4 text-zinc-300" />
        </CardTitle>
        <CardDescription className="mt-1">
          Multi-level escalation UI: timers, acknowledgements, and action log.
        </CardDescription>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Current level</div>
            <div className="text-xs text-zinc-400">
              {status === 'running' ? 'Auto-escalating' : status}
            </div>
          </div>
          <div className="text-2xl font-extrabold">L{level}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-zinc-300" /> Next escalation
            </div>
            <div className="text-sm text-zinc-200">{status === 'running' ? `${secondsLeft}s` : '—'}</div>
          </div>
          <div className="mt-2 text-xs text-zinc-400">
            If not acknowledged, the system escalates automatically.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button className="w-full" disabled={busy} onClick={start}>
            Start
          </Button>
          <Button className="w-full" variant="secondary" disabled={busy || status !== 'running'} onClick={escalate}>
            Escalate now
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            className="w-full"
            variant="secondary"
            disabled={busy || status === 'resolved'}
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
            onClick={acknowledge}
          >
            Acknowledge
          </Button>
          <Button
            className="w-full"
            variant="danger"
            disabled={busy || status === 'resolved'}
            onClick={resolve}
          >
            Resolve
          </Button>
        </div>
      </Card>

      <Card className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          Actions at this level <ShieldAlert className="h-4 w-4 text-zinc-300" />
        </CardTitle>
        <CardDescription>UI checklist of what the system would do.</CardDescription>
        <div className="mt-2 space-y-2">
          {steps.map((s) => (
            <div
              key={s.n}
              className={[
                'rounded-xl border px-3 py-2',
                s.n === level ? 'border-pink-300/30 bg-pink-500/10' : 'border-white/10 bg-black/20',
              ].join(' ')}
            >
              <div className="text-sm font-semibold">{s.title}</div>
              <div className="mt-1 text-xs text-zinc-400">{s.desc}</div>
              {s.n === 2 ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-300">
                  <BellRing className="h-3.5 w-3.5" /> Notify contacts (UI)
                </div>
              ) : null}
              {s.n === 3 ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-300">
                  <PhoneCall className="h-3.5 w-3.5" /> Call/SMS fallback (UI)
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-2">
        <CardTitle>Escalation log</CardTitle>
        <CardDescription>Realtime audit trail UI.</CardDescription>
        <div className="mt-2 space-y-2">
          {log.length ? (
            log.map((l) => (
              <div
                key={l.ts + l.text}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                <div className="text-xs text-zinc-400">{new Date(l.ts).toLocaleString()}</div>
                <div className="mt-1 text-zinc-200">{l.text}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-zinc-400">No events yet.</div>
          )}
        </div>
      </Card>
    </div>
  )
}
