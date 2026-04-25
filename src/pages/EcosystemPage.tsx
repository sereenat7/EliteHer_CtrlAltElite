import { Activity, ArrowLeft, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { supabase } from '../lib/supabase'
import { formatRelative } from '../lib/utils'

type Incident = {
  id: string
  type: string
  severity: number
  description: string | null
  created_at: string
  verified: boolean
}

export function EcosystemPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])

  async function refresh() {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
    const { data } = await supabase
      .from('incidents')
      .select('id,type,severity,description,created_at,verified')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000)
    setIncidents((data as any) ?? [])
  }

  useEffect(() => {
    refresh()
    const channel = supabase
      .channel('incidents-ecosystem')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, refresh)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const byType = useMemo(() => {
    const m = new Map<string, { count: number; avg: number }>()
    for (const i of incidents) {
      const cur = m.get(i.type) ?? { count: 0, avg: 0 }
      const nextCount = cur.count + 1
      const nextAvg = (cur.avg * cur.count + i.severity) / nextCount
      m.set(i.type, { count: nextCount, avg: nextAvg })
    }
    return [...m.entries()].sort((a, b) => b[1].count - a[1].count)
  }, [incidents])

  const avgSeverity = useMemo(() => {
    if (!incidents.length) return 0
    return incidents.reduce((a, b) => a + b.severity, 0) / incidents.length
  }, [incidents])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link to="/settings" className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <Card>
        <CardTitle className="flex items-center gap-2">
          Ecosystem Dashboard <Badge>last 7 days</Badge>
        </CardTitle>
        <CardDescription className="mt-1">
          Aggregated, real-time view for NGO/Admin access (built from real incidents in Supabase).
        </CardDescription>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-zinc-300" />
            Total reports
          </div>
          <div className="mt-1 text-2xl font-extrabold">{incidents.length}</div>
          <div className="text-xs text-zinc-400">Realtime updates enabled</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4 text-zinc-300" />
            Avg severity
          </div>
          <div className="mt-1 text-2xl font-extrabold">{avgSeverity.toFixed(1)}</div>
          <div className="text-xs text-zinc-400">Scale 1–5</div>
        </Card>
      </div>

      <Card className="space-y-2">
        <CardTitle>By incident type</CardTitle>
        <CardDescription>Counts + average severity.</CardDescription>
        <div className="mt-2 space-y-2">
          {byType.length ? (
            byType.map(([type, v]) => (
              <div
                key={type}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                <div className="font-semibold">{type}</div>
                <div className="text-xs text-zinc-300">
                  {v.count} • avg {v.avg.toFixed(1)}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-zinc-400">No data yet.</div>
          )}
        </div>
      </Card>

      <Card className="space-y-2">
        <CardTitle>Latest reports</CardTitle>
        <CardDescription>Most recent items (no mock data).</CardDescription>
        <div className="mt-2 space-y-2">
          {incidents.slice(0, 20).map((i) => (
            <div
              key={i.id}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
            >
              <div className="font-semibold">
                {i.type} • Sev {i.severity}/5 {i.verified ? '• verified' : ''}
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                {formatRelative(i.created_at)}
                {i.description ? ` • ${i.description}` : ''}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

