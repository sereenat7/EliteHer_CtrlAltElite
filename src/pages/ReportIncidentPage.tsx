import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { MapPin, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QuickReportModal } from '../components/QuickReportModal'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Input, Textarea } from '../components/ui/Input'
import { getCurrentPosition } from '../lib/location'
import { supabase } from '../lib/supabase'
import { useAuth } from '../app/auth/AuthProvider'
import { enqueue } from '../lib/offlineQueue'

const INCIDENT_TYPES = [
  'Harassment',
  'Stalking',
  'Suspicious activity',
  'Theft',
  'Violence',
  'Other',
] as const

export function ReportIncidentPage() {
  const { session } = useAuth()
  const [type, setType] = useState<(typeof INCIDENT_TYPES)[number]>('Suspicious activity')
  const [severity, setSeverity] = useState(3)
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)

  async function takePhoto() {
    const photo = await Camera.getPhoto({
      source: CameraSource.Prompt,
      resultType: CameraResultType.Uri,
      quality: 70,
    })
    setPhotoUri(photo.webPath ?? photo.path ?? null)
  }

  async function submit() {
    if (!session) return
    setBusy(true)
    setStatus(null)
    try {
      const pos = await getCurrentPosition()
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const payload = {
        type,
        severity,
        description: description.trim() ? description.trim() : null,
        lat,
        lng,
        reporter_id: session.user.id,
      }

      if (!navigator.onLine) {
        await enqueue('incident_report', payload)
        setStatus('Offline: report queued. Retry from Settings → Offline Queue.')
        setBusy(false)
        return
      }

      const { data: incident, error } = await supabase
        .from('incidents')
        .insert(payload)
        .select('id')
        .single()
      if (error) throw error

      if (photoUri) {
        const res = await fetch(photoUri)
        const blob = await res.blob()
        const ext = blob.type.includes('png') ? 'png' : 'jpg'
        const path = `users/${session.user.id}/incidents/${incident.id}/${Date.now()}.${ext}`
        const up = await supabase.storage.from('evidence').upload(path, blob, {
          contentType: blob.type,
          upsert: true,
        })
        if (!up.error) {
          await supabase.from('evidence_files').insert({
            incident_id: incident.id,
            path,
            mime: blob.type,
          })
        }
      }

      setDescription('')
      setPhotoUri(null)
      setSeverity(3)
      setType('Suspicious activity')
      setStatus('Report submitted. Thank you for helping the community.')
    } catch (e: any) {
      setStatus(e?.message ?? 'Failed to submit report')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardTitle>Report an incident</CardTitle>
        <CardDescription className="mt-1">
          Reports go into the live heatmap immediately (no mock data).
        </CardDescription>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" className="w-full" onClick={() => setQuickOpen(true)}>
          Quick report (10s)
        </Button>
        <Link to="/recording">
          <Button variant="secondary" className="w-full">
            Record evidence
          </Button>
        </Link>
      </div>

      <Card className="space-y-3">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-zinc-300">Type</div>
          <select
            className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-pink-300/50 focus:ring-2 focus:ring-pink-300/20"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          >
            {INCIDENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-zinc-300">Severity</div>
            <div className="text-xs text-zinc-400">{severity}/5</div>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full accent-pink-400"
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-zinc-300">Details (optional)</div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened? Any landmarks or context?"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={takePhoto}
            leftIcon={<Upload className="h-4 w-4" />}
          >
            Add photo
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              const p = await getCurrentPosition()
              const coords = `${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`
              setStatus(`Location captured: ${coords}`)
            }}
            leftIcon={<MapPin className="h-4 w-4" />}
          >
            Use GPS
          </Button>
        </div>

        {photoUri ? (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
            {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
            <img src={photoUri} alt="Evidence photo" className="h-40 w-full object-cover" />
          </div>
        ) : null}

        {status ? <div className="text-sm text-zinc-300">{status}</div> : null}

        <Button className="w-full" disabled={busy} onClick={submit}>
          {busy ? 'Submitting…' : 'Submit report'}
        </Button>
      </Card>

      <Card className="space-y-2">
        <CardTitle>Anonymous by default</CardTitle>
        <CardDescription>
          Your profile is never displayed publicly; only aggregated risk signals are shown.
        </CardDescription>
        <Input
          placeholder="Tip: Add trusted contacts in Settings → Contacts"
          disabled
        />
      </Card>

      <QuickReportModal open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  )
}
