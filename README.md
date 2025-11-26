# Deadhead Zero Reefer Whisper (Full Stack)

Evergreen one-page Next.js 14 app for a $99/month reefer SMS whisper subscription.

- Technology platform only, not a broker or load board.
- Stripe Checkout for subscription.
- Supabase used only in backend webhook to store subscriber profile.
- Supabase Edge Function (Deno) calls Grok and Twilio once per day at 6AM Eastern.

## 1. Vercel (Next.js app)

Root contains:

- app/page.tsx           → Landing + form
- app/api/register-subscriber/route.ts → Creates Stripe Checkout session
- app/api/stripe/webhook/route.ts      → Writes subscriber to Supabase profiles table
- app/success, app/terms, app/privacy

### Environment Variables (Vercel)

Set these in your Vercel project:

- NEXT_PUBLIC_SITE_URL = https://deadheadzero.com
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...
- STRIPE_SECRET_KEY = sk_live_...
- STRIPE_PRICE_ID = price_...
- STRIPE_WEBHOOK_SECRET = whsec_...
- SUPABASE_URL = https://YOUR_PROJECT.supabase.co
- SUPABASE_SERVICE_ROLE_KEY = service-role-key-from-Supabase

## 2. Supabase (Database)

Run this SQL in Supabase:

```sql
create table profiles (
  id uuid default gen_random_uuid() primary key,
  email text unique,
  phone text,
  name text,
  stripe_customer_id text,
  paid_until date
);
```

Stripe webhook upserts `paid_until = '2099-01-01'` for all successful subscribers.

## 3. Supabase Edge Function (daily-whisper)

Code is in `supabase/functions/daily-whisper/index.ts`.

This file is **Deno-only** and is **excluded** from the Next.js TypeScript build via `tsconfig.json`.

### Steps in Supabase dashboard

1. Go to **Edge Functions → New Function** called `daily-whisper`.
2. Paste the contents of `supabase/functions/daily-whisper/index.ts`.
3. Add the following environment variables in the function config:
   - GROK_API_KEY
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - TWILIO_SID
   - TWILIO_AUTH_TOKEN
   - TWILIO_FROM (your Twilio number, e.g. +18885551234)
4. Add a **Cron Schedule**: `0 6 * * *` and set timezone to Eastern (US/Eastern).
5. Deploy the function.

### What the function does

- Reads all profiles with `paid_until > today`.
- Calls Grok (xAI) to generate one short nationwide reefer whisper.
- Sends the same SMS to every paid phone via Twilio REST API.

This gives you the exact flow you described: one reefer text per day, same message to all paid subs, zero manual maintenance.

## 4. Notes

- Next.js app is build-clean on Vercel.
- Grok + Twilio run **only** inside Supabase Edge Function, never at build time.
- If a user cancels in Stripe Customer Portal, you can later extend the webhook to update `paid_until` to a past date or remove the row.
