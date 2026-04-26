/// <reference lib="deno.ns" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// SOS escalation (Edge Function)
// POST { sos_event_id: "uuid" }
//
// This reads the SOS event + the user's trusted contacts and triggers:
// - Level 1: just logs
// - Level 2: send SMS (Twilio) + push (FCM) to registered devices (if available)
// - Level 3: same + marks as "triggered" (client shows emergency UI)
//
// Requires:
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (provided by Supabase in function env)
// - TWILIO_* secrets and/or FCM_SERVER_KEY (optional)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function twilioSend(to: string, body: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_FROM')
  if (!accountSid || !authToken || !from) return { ok: false, error: 'Twilio not configured' }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const form = new URLSearchParams({ To: to, From: from, Body: body })
  const basic = btoa(`${accountSid}:${authToken}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  const text = await res.text()
  if (!res.ok) return { ok: false, error: text }
  return { ok: true }
}

async function twilioCall(to: string, twimlMessage: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_FROM')
  if (!accountSid || !authToken || !from) return { ok: false, error: 'Twilio not configured' }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`
  const twiml = `<Response><Say voice="alice">${twimlMessage}</Say></Response>`
  const form = new URLSearchParams({ To: to, From: from, Twiml: twiml })
  const basic = btoa(`${accountSid}:${authToken}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  const text = await res.text()
  if (!res.ok) return { ok: false, error: text }
  return { ok: true }
}

async function fcmSend(token: string, title: string, body: string, data: Record<string, string>) {
  const serverKey = Deno.env.get('FCM_SERVER_KEY')
  if (!serverKey) return { ok: false, error: 'FCM not configured' }

  const payload = { to: token, notification: { title, body }, data }
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: { Authorization: `key=${serverKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  if (!res.ok) return { ok: false, error: text }
  return { ok: true }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const { sos_event_id } = (await req.json().catch(() => ({}))) as { sos_event_id?: string }
  if (!sos_event_id) return json({ error: 'Missing sos_event_id' }, 400)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceRoleKey) return json({ error: 'Supabase env missing' }, 500)

  // Authenticate caller (anonymous sign-in counts as authenticated) and ensure ownership via RLS.
  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: userData } = await userClient.auth.getUser()
  if (!userData.user) return json({ error: 'Unauthorized' }, 401)

  // Read the SOS event through RLS (must be owned by caller).
  const { data: ownedSos, error: ownedErr } = await userClient
    .from('sos_events')
    .select('id,user_id,level,status,created_at')
    .eq('id', sos_event_id)
    .single()
  if (ownedErr || !ownedSos) return json({ error: 'SOS event not found' }, 404)

  // Service role client for integrations and audit writes.
  const supabase = createClient(url, serviceRoleKey)

  const { data: sos, error: sosErr } = await supabase
    .from('sos_events')
    .select('id,user_id,level,status,created_at')
    .eq('id', sos_event_id)
    .single()
  if (sosErr || !sos) return json({ error: 'SOS event not found', details: sosErr?.message }, 404)

  const { data: contacts } = await supabase
    .from('contacts')
    .select('name,phone')
    .eq('user_id', sos.user_id)

  const { data: devices } = await supabase
    .from('devices')
    .select('push_token')
    .eq('user_id', sos.user_id)
    .neq('push_token', null)

  const { data: latestPresence } = await supabase
    .from('user_presence')
    .select('lat,lng,last_seen')
    .eq('user_id', sos.user_id)
    .maybeSingle()
  const mapUrl =
    latestPresence?.lat && latestPresence?.lng
      ? `https://www.openstreetmap.org/?mlat=${latestPresence.lat}&mlon=${latestPresence.lng}#map=17/${latestPresence.lat}/${latestPresence.lng}`
      : ''
  const msg = `Saaya SOS (Level ${sos.level}). ${mapUrl ? `Live location: ${mapUrl}` : 'Open the app for live details.'}`
  const smsResults: any[] = []
  const callResults: any[] = []
  const pushResults: any[] = []
  let witnessRequestId: string | null = null

  if (sos.level >= 2) {
    for (const c of contacts ?? []) {
      smsResults.push({ to: c.phone, ...(await twilioSend(c.phone, msg)) })
    }
    for (const d of devices ?? []) {
      pushResults.push(
        await fcmSend(d.push_token, 'Saaya SOS', msg, { sos_event_id: sos.id, level: String(sos.level) }),
      )
    }

    if (latestPresence?.lat && latestPresence?.lng) {
      const { data: req } = await supabase
        .from('witness_requests')
        .insert({
          user_id: sos.user_id,
          sos_event_id: sos.id,
          message: 'Emergency nearby: user may need immediate help.',
          lat: latestPresence.lat,
          lng: latestPresence.lng,
          status: 'open',
        })
        .select('id')
        .single()
      witnessRequestId = req?.id ?? null
    }
  }

  if (sos.level >= 3) {
    for (const c of contacts ?? []) {
      callResults.push({
        to: c.phone,
        ...(await twilioCall(c.phone, 'Saaya emergency alert. Please open the app for live location.')),
      })
    }
  }

  await supabase.from('sos_actions').insert({
    sos_event_id: sos.id,
    action: 'escalate',
    meta: { level: sos.level, smsResults, pushResults, callResults, witnessRequestId },
  })

  return json({ ok: true, level: sos.level, smsResults, pushResults, callResults, witnessRequestId })
})
