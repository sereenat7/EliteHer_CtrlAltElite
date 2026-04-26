## Supabase Edge Functions (backend integrations)

This folder contains Supabase Edge Functions stubs for:
- SOS escalation (multi-level)
- SMS sending (Twilio)
- Push notifications (FCM)

Deploy with:
```bash
supabase functions deploy sos-escalate
supabase functions deploy send-sms
supabase functions deploy send-push
```

Required secrets (set in Supabase project):
```bash
supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM=...
supabase secrets set FCM_SERVER_KEY=...
```

