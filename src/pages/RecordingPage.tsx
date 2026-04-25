import { ArrowLeft, Mic, Square, Upload, Video } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { supabase } from '../lib/supabase'
import { useAuth } from '../app/auth/AuthProvider'
import { enqueue } from '../lib/offlineQueue'

type Mode = 'audio' | 'video'

export function RecordingPage() {
  const { session } = useAuth()
  const [params] = useSearchParams()
  const sosId = params.get('sos')
  const incidentId = params.get('incident')

  const [mode, setMode] = useState<Mode>('audio')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [recording, setRecording] = useState(false)

  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const supported = useMemo(() => typeof window !== 'undefined' && !!(window as any).MediaRecorder, [])

  useEffect(() => {
    return () => {
      try {
        mediaRef.current?.stop()
      } catch {
        // ignore
      }
      mediaRef.current = null
    }
  }, [])

  async function start() {
    setStatus(null)
    if (!supported) {
      setStatus('Recording not supported in this environment.')
      return
    }
    setBusy(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        mode === 'audio' ? { audio: true } : { audio: true, video: true },
      )
      chunksRef.current = []
      const rec = new MediaRecorder(stream)
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const b = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' })
        setBlob(b)
        setStatus('Recording captured.')
      }
      rec.start()
      mediaRef.current = rec
      setRecording(true)
      setStatus('Recording…')
    } catch (e: any) {
      setStatus(e?.message ?? 'Failed to start recording')
    } finally {
      setBusy(false)
    }
  }

  async function stop() {
    try {
      mediaRef.current?.stop()
    } catch {
      // ignore
    }
    setRecording(false)
  }

  async function upload() {
    if (!blob) return
    if (!session) return
    setBusy(true)
    setStatus(null)
    try {
      const mime = blob.type || (mode === 'audio' ? 'audio/webm' : 'video/webm')
      const ext = mime.includes('audio') ? 'webm' : 'webm'
      const path = `users/${session.user.id}/recordings/${Date.now()}.${ext}`

      if (!navigator.onLine) {
        await enqueue('evidence_upload', { path, mime, sos_event_id: sosId, incident_id: incidentId })
        setStatus('Queued upload (offline). See Offline Queue.')
        return
      }

      const up = await supabase.storage.from('evidence').upload(path, blob, { contentType: mime, upsert: true })
      if (up.error) throw up.error
      await supabase.from('evidence_files').insert({
        sos_event_id: sosId,
        incident_id: incidentId,
        path,
        mime,
      })
      setStatus('Uploaded to evidence storage.')
      setBlob(null)
    } catch (e: any) {
      setStatus(e?.message ?? 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link to="/sos" className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        {sosId ? <Badge>sos {sosId.slice(0, 6)}</Badge> : incidentId ? <Badge>incident</Badge> : <Badge>unlinked</Badge>}
      </div>

      <Card>
        <CardTitle>Auto recording (UI)</CardTitle>
        <CardDescription className="mt-1">
          Capture audio/video evidence. Works where MediaRecorder is supported; uploads to Supabase Storage.
        </CardDescription>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={mode === 'audio' ? 'primary' : 'secondary'}
          className="w-full"
          leftIcon={<Mic className="h-4 w-4" />}
          onClick={() => setMode('audio')}
          disabled={recording}
        >
          Audio
        </Button>
        <Button
          variant={mode === 'video' ? 'primary' : 'secondary'}
          className="w-full"
          leftIcon={<Video className="h-4 w-4" />}
          onClick={() => setMode('video')}
          disabled={recording}
        >
          Video
        </Button>
      </div>

      <Card className="space-y-3">
        {status ? <div className="text-sm text-zinc-200">{status}</div> : null}

        {!recording ? (
          <Button className="w-full" disabled={busy} onClick={start}>
            Start recording
          </Button>
        ) : (
          <Button
            className="w-full"
            variant="danger"
            leftIcon={<Square className="h-4 w-4" />}
            onClick={stop}
          >
            Stop
          </Button>
        )}

        {blob ? (
          <div className="space-y-2">
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-400">
              Captured: {(blob.size / 1024).toFixed(0)} KB • {blob.type || 'webm'}
            </div>
            <Button
              variant="secondary"
              className="w-full"
              leftIcon={<Upload className="h-4 w-4" />}
              disabled={busy || !session}
              onClick={upload}
            >
              Upload evidence
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  )
}

