/// <reference lib="deno.ns" />

import { corsHeaders } from '../_shared/cors.ts'

// Twilio SMS sender (Edge Function)
// POST { to: "+1...", body: "..." }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const { to, body } = (await req.json().catch(() => ({}))) as {
    to?: string
    body?: string
  }

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_FROM')

  if (!accountSid || !authToken || !from) {
    return json({ error: 'Twilio secrets not configured' }, 400)
  }
  if (!to || !body) return json({ error: 'Missing to/body' }, 400)

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const form = new URLSearchParams({ To: to, From: from, Body: body })
  const basic = btoa(`${accountSid}:${authToken}`)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })

  const text = await res.text()
  if (!res.ok) return json({ error: 'Twilio error', details: text }, 502)
  return json({ ok: true, details: text })
})

