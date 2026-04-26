/// <reference lib="deno.ns" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function fcmSend(serverKey: string, token: string, title: string, body: string, data: Record<string, string>) {
  const payload = { to: token, notification: { title, body }, data }
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: { Authorization: `key=${serverKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.ok
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceRoleKey) return json({ error: 'Supabase env missing' }, 500)

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: authData } = await userClient.auth.getUser()
  const user = authData.user
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const body = (await req.json().catch(() => ({}))) as {
    lat?: number
    lng?: number
    message?: string
    sos_event_id?: string | null
    radius_m?: number
  }

  const lat = Number(body.lat)
  const lng = Number(body.lng)
  const radius = Math.min(Math.max(Number(body.radius_m || 1500), 200), 5000)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return json({ error: 'Missing lat/lng' }, 400)
  }

  const supabase = createClient(url, serviceRoleKey)
  const { data: nearby, error: nearErr } = await supabase.rpc('nearby_helpers', {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radius,
  })
  if (nearErr) return json({ error: nearErr.message }, 400)

  const helperIds = (nearby ?? [])
    .map((r: { helper_user_id: string }) => r.helper_user_id)
    .filter((id: string) => id && id !== user.id)

  const msg = body.message || 'Nearby user may need assistance.'
  const { data: request, error: reqErr } = await supabase
    .from('witness_requests')
    .insert({
      user_id: user.id,
      sos_event_id: body.sos_event_id ?? null,
      message: msg,
      lat,
      lng,
      status: 'open',
    })
    .select('id')
    .single()
  if (reqErr) return json({ error: reqErr.message }, 400)

  let notified = 0
  const fcmKey = Deno.env.get('FCM_SERVER_KEY')
  if (fcmKey && helperIds.length) {
    const { data: devices } = await supabase
      .from('devices')
      .select('push_token,user_id')
      .in('user_id', helperIds)
      .neq('push_token', null)
    for (const d of devices ?? []) {
      if (!d.push_token) continue
      const ok = await fcmSend(fcmKey, d.push_token, 'Nearby Safety Alert', msg, {
        request_id: request.id,
        type: 'witness_request',
      })
      if (ok) notified += 1
    }
  }

  if (body.sos_event_id) {
    await supabase.from('sos_actions').insert({
      sos_event_id: body.sos_event_id,
      action: 'nearby_alert_broadcast',
      meta: { request_id: request.id, helper_count: helperIds.length, notified },
    })
  }

  return json({ ok: true, request_id: request.id, helper_count: helperIds.length, notified })
})
