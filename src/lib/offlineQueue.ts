import localforage from 'localforage'
import { supabase } from './supabase'

export type QueueItemType =
  | 'incident_report'
  | 'evidence_upload'
  | 'sos_event'
  | 'witness_broadcast'

export type QueueItem = {
  id: string
  type: QueueItemType
  createdAt: string
  payload: any
  status: 'queued' | 'retrying' | 'failed'
  lastError?: string
}

const store = localforage.createInstance({ name: 'saaya', storeName: 'offlineQueue' })

function uid() {
  return `q_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

export async function listQueue(): Promise<QueueItem[]> {
  const keys = await store.keys()
  const items: QueueItem[] = []
  for (const k of keys) {
    const v = await store.getItem<QueueItem>(k)
    if (v) items.push(v)
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function enqueue(type: QueueItemType, payload: any) {
  const item: QueueItem = {
    id: uid(),
    type,
    createdAt: new Date().toISOString(),
    payload,
    status: 'queued',
  }
  await store.setItem(item.id, item)
  return item
}

export async function removeQueueItem(id: string) {
  await store.removeItem(id)
}

export async function retryQueueItem(item: QueueItem) {
  const next: QueueItem = { ...item, status: 'retrying', lastError: undefined }
  await store.setItem(item.id, next)
  try {
    if (item.type === 'incident_report') {
      const { error } = await supabase.from('incidents').insert(item.payload)
      if (error) throw error
    } else if (item.type === 'sos_event') {
      const { error } = await supabase.from('sos_events').insert(item.payload)
      if (error) throw error
    } else {
      // evidence_upload, witness_broadcast: UI-first placeholders
      // Keep queued until backend wiring is added.
      throw new Error('This item type is not yet synced automatically.')
    }

    await store.removeItem(item.id)
    return { ok: true as const }
  } catch (e: any) {
    const failed: QueueItem = {
      ...item,
      status: 'failed',
      lastError: e?.message ?? 'Failed to sync',
    }
    await store.setItem(item.id, failed)
    return { ok: false as const, error: failed.lastError }
  }
}

export async function retryAll() {
  const items = await listQueue()
  const results = []
  for (const it of items) {
    if (it.status === 'queued' || it.status === 'failed') {
      results.push({ id: it.id, ...(await retryQueueItem(it)) })
    }
  }
  return results
}

