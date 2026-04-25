import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { BellRing, PhoneCall, ShieldAlert, Siren, Upload, Users, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { SectionLink } from '../components/ui/SectionLink'
import { supabase } from '../lib/supabase'
import { useAuth } from '../app/auth/AuthProvider'
import { formatRelative } from '../lib/utils'

type SosEvent = {
  id: string
  level: number
  status: 'triggered' | 'acknowledged' | 'resolved'
  created_at: string
}

export function SosPage() {
  const { session } = useAuth()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [events, setEvents] = useState<SosEvent[]>([])
  const [activeEventId, setActiveEventId] = useState<string | null>(null)

  const holdTimer = useRef<number | null>(null)
  const [holding, setHolding] = useState(false)

  async function refresh() {
    const { data } = await supabase
      .from('sos_events')
      .select('id,level,status,created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    setEvents((data as any) ?? [])
  }

  useEffect(() => {
    refresh()
    const channel = supabase
      .channel('sos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_events' }, refresh)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function triggerSos() {
    if (!session) return
    setBusy(true)
    setStatus(null)
    try {
      const { data, error } = await supabase
        .from('sos_events')
        .insert({ level: 1, status: 'triggered' })
        .select('id')
        .single()
      if (error) throw error
      setActiveEventId(data.id)
      setStatus('SOS triggered. Escalation is pluggable (configure providers in backend).')
      await Haptics.impact({ style: ImpactStyle.Heavy })
      await refresh()
    } catch (e: any) {
      setStatus(e?.message ?? 'Failed to trigger SOS')
    } finally {
      setBusy(false)
    }
  }

  async function addEvidence() {
    if (!activeEventId) {
      setStatus('Trigger SOS first, then attach evidence.')
      return
    }
    if (!session) return
    const photo = await Camera.getPhoto({
      source: CameraSource.Prompt,
      resultType: CameraResultType.Uri,
      quality: 70,
    })
    const uri = photo.webPath ?? photo.path
    if (!uri) return

    setBusy(true)
    try {
      const res = await fetch(uri)
      const blob = await res.blob()
      const ext = blob.type.includes('png') ? 'png' : 'jpg'
      const path = `users/${session.user.id}/sos/${activeEventId}/${Date.now()}.${ext}`
      const up = await supabase.storage.from('evidence').upload(path, blob, {
        contentType: blob.type,
        upsert: true,
      })
      if (up.error) throw up.error
      await supabase.from('evidence_files').insert({
        sos_event_id: activeEventId,
        path,
        mime: blob.type,
      })
      setStatus('Evidence uploaded.')
    } catch (e: any) {
      setStatus(e?.message ?? 'Failed to upload evidence')
    } finally {
      setBusy(false)
    }
  }

  function startHold() {
    if (busy) return
    setHolding(true)
    holdTimer.current = window.setTimeout(() => {
      setHolding(false)
      triggerSos()
    }, 1600)
  }

  function cancelHold() {
    setHolding(false)
    if (holdTimer.current) window.clearTimeout(holdTimer.current)
    holdTimer.current = null
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardTitle>Emergency</CardTitle>
        <CardDescription className="mt-1">
          Hold to trigger SOS. (Pluggable escalation—wire Twilio/FCM in the backend.)
        </CardDescription>
      </Card>

      <div className="space-y-2">
        <SectionLink
          to={activeEventId ? `/sos/escalation?id=${activeEventId}` : '/sos/escalation'}
          title="Auto SOS escalation"
          description="Leveling + timers + acknowledgements + escalation log (UI)"
          left={<ShieldAlert className="h-5 w-5 text-zinc-200" />}
        />
        <SectionLink
          to="/emergency"
          title="Emergency call + SMS fallback"
          description="112 + SMS compose (UI)"
          left={<PhoneCall className="h-5 w-5 text-zinc-200" />}
        />
        <SectionLink
          to={activeEventId ? `/recording?sos=${activeEventId}` : '/recording'}
          title="Auto recording"
          description="Audio/video capture UI + evidence upload"
          left={<Upload className="h-5 w-5 text-zinc-200" />}
        />
        <SectionLink
          to="/witnesses"
          title="Community mobilization"
          description="Digital witnesses + verification UI"
          left={<Users className="h-5 w-5 text-zinc-200" />}
        />
        <SectionLink
          to="/nearby-users"
          title="Nearby users alerted"
          description="Community alert settings UI"
          left={<BellRing className="h-5 w-5 text-zinc-200" />}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <VolumeX className="h-4 w-4 text-zinc-300" />
            Hidden mode
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            Use silent triggers + evidence capture even in public.
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Upload className="h-4 w-4 text-zinc-300" />
            Evidence
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            Photos upload to Supabase Storage with encryption-at-rest.
          </div>
        </Card>
      </div>

      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-3">
        <button
          className="relative flex h-40 w-full items-center justify-center rounded-3xl bg-red-500/20 ring-1 ring-red-400/30 transition active:scale-[0.99]"
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-500/20 ring-1 ring-red-300/30">
              <Siren className="h-7 w-7 text-red-200" />
            </div>
            <div className="text-lg font-extrabold tracking-tight text-white">
              {holding ? 'Hold…' : 'Hold to SOS'}
            </div>
            <div className="text-xs text-red-100/80">Triggers after ~1.6 seconds</div>
          </div>
        </button>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={addEvidence} disabled={busy}>
            Add evidence
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              if (!activeEventId) return
              await supabase.from('sos_events').update({ status: 'resolved' }).eq('id', activeEventId)
              setStatus('Marked as resolved.')
              setActiveEventId(null)
              refresh()
            }}
            disabled={busy || !activeEventId}
          >
            Resolve
          </Button>
        </div>

        {status ? <div className="mt-3 text-sm text-zinc-100">{status}</div> : null}
      </div>

      <Card className="space-y-2">
        <CardTitle>Recent SOS events</CardTitle>
        <CardDescription>Synced in realtime from Supabase.</CardDescription>
        <div className="mt-2 space-y-2">
          {events.length ? (
            events.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-semibold">Level {e.level}</div>
                  <div className="text-xs text-zinc-400">{formatRelative(e.created_at)}</div>
                </div>
                <div className="text-xs text-zinc-300">{e.status}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-zinc-400">No SOS events yet.</div>
          )}
        </div>
      </Card>
    </div>
  )
}
