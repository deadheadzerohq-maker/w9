// Supabase Edge Function: daily-whisper
// This runs inside Supabase (Deno). Configure schedule to 6:00 AM Eastern daily.
// It pulls paid profiles, asks Grok for a single nationwide reefer whisper,
// then sends the same SMS to every paid phone via Twilio.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GROK_API_KEY = Deno.env.get("GROK_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_SID = Deno.env.get("TWILIO_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_FROM = Deno.env.get("TWILIO_FROM")!;

// Simple Supabase client using fetch
async function fetchPaidPhones() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?paid_until=gt.${today}&select=phone`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  if (!res.ok) {
    console.error("Error fetching profiles:", await res.text());
    return [];
  }
  const data = await res.json();
  return data.map((row: { phone: string }) => row.phone).filter((p) => !!p);
}

// Call Grok (xAI) to generate the daily whisper
async function generateWhisper(): Promise<string> {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROK_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "grok-2-latest",
      messages: [
        {
          role: "system",
          content: "You are Deadhead Zero, generating one ultra-actionable daily reefer lane whisper for US trucking carriers."
        },
        {
          role: "user",
          content: "Using public USDA and FMCSA style data (produce, seasonality, inspections) imagine the most interesting nationwide reefer alert for the next 24-48 hours. Return ONE short SMS like: 'Reefer Alert: South Texas northbound spiking hard tomorrow – citrus + holiday greens surge. – Deadhead Zero'"
        }
      ],
      max_tokens: 120
    })
  });

  if (!res.ok) {
    console.error("Grok error:", await res.text());
    return "Reefer Alert: Watch reefer capacity tightening on core northbound lanes today. – Deadhead Zero";
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  return text.trim();
}

// Send SMS via Twilio REST API
async function sendSms(to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const params = new URLSearchParams({
    To: to,
    From: TWILIO_FROM,
    Body: body
  });

  const auth = btoa(`${TWILIO_SID}:${TWILIO_AUTH_TOKEN}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });

  if (!res.ok) {
    console.error("Twilio send error:", to, await res.text());
  }
}

serve(async (_req) => {
  try {
    const phones = await fetchPaidPhones();
    if (!phones.length) {
      console.log("No paid phones found.");
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const whisper = await generateWhisper();

    await Promise.all(
      phones.map((phone) => sendSms(phone, whisper))
    );

    return new Response(JSON.stringify({ sent: phones.length }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("daily-whisper error:", err);
    return new Response("Internal Error", { status: 500 });
  }
});
