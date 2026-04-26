# Saaya — Safety App (Capacitor + Supabase + MapTiler)

This is a **working** Saaya v1 app (no seeded/mock incident data). All data shown on the map comes from real user submissions stored in **Supabase Postgres** and streamed via **Supabase Realtime**.

## What’s implemented
- No-login UX via **Supabase Anonymous Sign-ins** (auto-creates a session)
- Safety map (MapTiler + MapLibre) with live **heatmap + points** from `incidents`
- Incident reporting (GPS + optional photo evidence → Supabase Storage)
- Safe Journey mode (destination search + route preview + basic check-in prompt)
- SOS screen (hold-to-trigger) + evidence attachment
- Trusted contacts CRUD

## 1) Backend setup (Supabase)
1. Create a new Supabase project.
2. In **SQL Editor**, run: `supabase/schema.sql`
3. In **Authentication → Sign In / Providers**, enable **Anonymous Sign-ins**.
   - This app auto-signs users in anonymously so you can use the full UI without a login screen.
4. (Optional) Enable Email auth later if you want user accounts.
4. Copy your project values:
   - **Project URL**
   - **Anon public key**

## 1b) Backend integrations (Twilio + Push)
For “Full integrations” (SMS/calls + push), deploy the Edge Functions in `supabase/functions/` and set secrets:
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`
- FCM: `FCM_SERVER_KEY`

These are set in Supabase (do not commit to GitHub):
```bash
supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM=...
supabase secrets set FCM_SERVER_KEY=...
```

## 2) Map setup (MapTiler Cloud)
1. Create a MapTiler Cloud API key.
2. (Optional) Set `VITE_MAPTILER_MAP_ID` (defaults to `streets-v4`).

## 3) App setup
1. Copy env file:
   ```bash
   cp .env.example .env
   ```
2. Fill in values inside `.env`.
   - Do **NOT** commit `.env` to GitHub (it contains secrets). This repo ignores it via `.gitignore`.
3. Install + run:
   ```bash
   npm install
   npm run dev
   ```

## 4) Run on Android / iOS (Capacitor)
Build + sync native projects:
```bash
npm run cap:sync
```

Open native IDEs:
```bash
npm run android
npm run ios
```

### Notes
- Location permissions are handled by Capacitor’s Geolocation plugin, but on real devices you may need to approve permissions the first time.
- SOS escalation to SMS/calls is **pluggable**: the app writes `sos_events` rows; you can attach Edge Functions / webhooks to actually notify contacts (Twilio, FCM, etc.).
- Journey route preview in v1 uses a straight-line route between origin and destination (MapTiler Cloud provides maps + geocoding).
