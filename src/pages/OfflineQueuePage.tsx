import { ArrowLeft, RefreshCw, Trash2, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { listQueue, removeQueueItem, retryAll, retryQueueItem, type QueueItem } from '../lib/offlineQueue'
import { formatRelative } from '../lib/utils'

export function OfflineQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [busy, setBusy] = useState(false)

  async function refresh() {
    setItems(await listQueue())
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link to="/settings" className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={async () => {
            setBusy(true)
            try {
              await refresh()
            } finally {
              setBusy(false)
            }
          }}
        >
          Refresh
        </Button>
      </div>

      <Card>
        <CardTitle className="flex items-center gap-2">
          Offline Queue <WifiOff className="h-4 w-4 text-zinc-300" />
        </CardTitle>
        <CardDescription className="mt-1">
          When you’re offline, actions are queued here. Retry when you’re back online.
        </CardDescription>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button
          className="w-full"
          disabled={busy || !items.length}
          onClick={async () => {
            setBusy(true)
            try {
              await retryAll()
              await refresh()
            } finally {
              setBusy(false)
            }
          }}
        >
          Retry all
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          disabled={busy || !items.length}
          onClick={async () => {
            setBusy(true)
            try {
              for (const it of items) await removeQueueItem(it.id)
              await refresh()
            } finally {
              setBusy(false)
            }
          }}
        >
          Clear all
        </Button>
      </div>

      <Card className="space-y-2">
        <CardTitle>Queued items</CardTitle>
        <CardDescription>UI-first: some item types are not auto-synced yet.</CardDescription>
        <div className="mt-2 space-y-2">
          {items.length ? (
            items.map((it) => (
              <div
                key={it.id}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{it.type}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {it.status} • {formatRelative(it.createdAt)}
                      {it.lastError ? ` • ${it.lastError}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true)
                        try {
                          await retryQueueItem(it)
                          await refresh()
                        } finally {
                          setBusy(false)
                        }
                      }}
                    >
                      Retry
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      leftIcon={<Trash2 className="h-4 w-4" />}
                      onClick={async () => {
                        await removeQueueItem(it.id)
                        await refresh()
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-zinc-400">Nothing queued.</div>
          )}
        </div>
      </Card>
    </div>
  )
}

