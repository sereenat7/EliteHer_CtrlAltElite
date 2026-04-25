import { AlarmClock, MapPin, ShieldPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { Textarea } from './ui/Input'
import { getCurrentPosition } from '../lib/location'
import { supabase } from '../lib/supabase'
import { enqueue } from '../lib/offlineQueue'

const TYPES = ['Suspicious activity', 'Harassment', 'Stalking', 'Theft', 'Violence', 'Other']

export function QuickReportModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [type, setType] = useState(TYPES[0])
  const [severity, setSeverity] = useState(3)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [seconds, setSeconds] = useState(10)
  const [counting, setCounting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const canSubmit = useMemo(() => !busy && !counting, [busy, counting])

  useEffect(() => {
    if (!open) {
      setStatus(null)
      setCounting(false)
      setSeconds(10)
    }
  }, [open])

  useEffect(() => {
    if (!counting) return
    if (seconds <= 0) return
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [counting, seconds])

  async function submit() {
    setBusy(true)
    setStatus(null)
    try {
      const pos = await getCurrentPosition()
      const payload = {
        type,
        severity,
        description: note.trim() ? note.trim() : null,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }

      if (!navigator.onLine) {
        await enqueue('incident_report', payload)
        setStatus('Queued (offline). It will sync when you retry from Offline Queue.')
        return
      }

      const { error } = await supabase.from('incidents').insert(payload)
      if (error) throw error
      setStatus('Sent. Thank you.')
    } catch (e: any) {
      setStatus(e?.message ?? 'Failed to send')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Fast anonymous report (10 sec)">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <div className="text-xs text-zinc-400">Timer</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
              <AlarmClock className="h-4 w-4 text-zinc-300" /> {seconds}s
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <div className="text-xs text-zinc-400">GPS</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-zinc-300" /> Auto
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-300">Type</div>
          <select
            className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-pink-300/50 focus:ring-2 focus:ring-pink-300/20"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={!canSubmit}
          >
            {TYPES.map((t) => (
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
            disabled={!canSubmit}
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-zinc-300">Note (optional)</div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Short description or landmark…"
            disabled={!canSubmit}
          />
        </div>

        {status ? <div className="text-sm text-zinc-200">{status}</div> : null}

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setCounting(false)
              setSeconds(10)
              onClose()
            }}
            disabled={busy}
          >
            Close
          </Button>
          <Button
            onClick={async () => {
              setCounting(true)
              setSeconds(10)
              window.setTimeout(async () => {
                setCounting(false)
                await submit()
              }, 10000)
            }}
            disabled={busy || counting}
            leftIcon={<ShieldPlus className="h-4 w-4" />}
          >
            {counting ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
