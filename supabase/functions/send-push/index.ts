/// <reference lib="deno.ns" />

import { corsHeaders } from '../_shared/cors.ts'

// FCM sender (Edge Function)
// POST { token: "...", title: "...", body: "...", data?: Record<string,string> }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const { token, title, body, data } = (await req.json().catch(() => ({}))) as {
    token?: string
    title?: string
    body?: string
    data?: Record<string, string>
  }

  const serverKey = Deno.env.get('FCM_SERVER_KEY')
  if (!serverKey) return json({ error: 'FCM_SERVER_KEY not configured' }, 400)
  if (!token || !title || !body) return json({ error: 'Missing token/title/body' }, 400)

  const payload = {
    to: token,
    notification: { title, body },
    data: data ?? {},
  }

  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${serverKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  if (!res.ok) return json({ error: 'FCM error', details: text }, 502)
  return json({ ok: true, details: text })
})

