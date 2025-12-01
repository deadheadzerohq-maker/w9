// supabase/functions/daily-whisper/index.ts

import { createClient } from "npm:@supabase/supabase-js@2";

type Subscriber = {
  id: string;
  email: string | null;
  phone: string | null;
};

type WhisperInsert = {
  whisper_date: string; // 'YYYY-MM-DD'
  body: string;
  source_model: string;
  raw_usda_payload: any;
  raw_fmcsa_payload: any;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GROK_API_KEY = Deno.env.get("GROK_API_KEY")!; // xAI / Grok key
const USDA_API_KEY = Deno.env.get("USDA_API_KEY") ?? ""; // MyMarketNews API key
const FMCSA_WEB_KEY = Deno.env.get("FMCSA_WEB_KEY") ?? ""; // QCMobile API key

// Comma-separated DOT numbers for reefer-focused carriers you care about
// Example: "1234567,2345678,3456789"
const FMCSA_REEFER_DOT_LIST = (Deno.env.get("FMCSA_REEFER_DOT_LIST") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Twilio configuration
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---- USDA: SC National Truck Rate (FVWTRK, slug 2375) ----
async function fetchUsdaContext(): Promise<string> {
  const url =
    "https://marsapi.ams.usda.gov/services/v1.2/reports/2375?lastReports=1&allSections=true";

  const headers: Record<string, string> = {};
  if (USDA_API_KEY) {
    // Basic auth: api_key as username, blank password
    const basic = btoa(`${USDA_API_KEY}:`);
    headers["Authorization"] = `Basic ${basic}`;
  }

  try {
    const res = await fetch(url, { headers });

    if (!res.ok) {
      console.error("USDA API error", res.status, await res.text());
      return "USDA data unavailable";
    }

    const data = (await res.json()) as any[];

    if (!Array.isArray(data) || data.length === 0) {
      return "USDA data unavailable";
    }

    const section =
      data.find(
        (d: any) =>
          d.reportSection === "Report Detail" || d.section === "Report Detail",
      ) ?? data[0];

    const results: any[] = Array.isArray(section?.results)
      ? section.results
      : [];

    const lines = results.slice(0, 8).map((row) => {
      const origin =
        row.market ?? row.origin ?? row.district ?? row.region ?? "";
      const dest =
        row.city ?? row.destination ?? row.to_location ?? row.toCity ?? "";
      const commodity =
        row.commodity ?? row.commodity_desc ?? row.commodityName ?? "";

      const low =
        row.lowPrice ??
        row.freightRateLow ??
        row.rate_low ??
        row.fob_low ??
        null;
      const high =
        row.highPrice ??
        row.freightRateHigh ??
        row.rate_high ??
        row.fob_high ??
        null;

      const avail =
        row.truckAvailability ??
        row.truck_availability ??
        row.availability ??
        "";

      let rateStr = "";
      if (low && high) rateStr = `$${low}-${high}`;
      else if (low) rateStr = `$${low}`;

      const parts = [
        commodity,
        origin && dest ? `${origin}→${dest}` : "",
        rateStr,
        avail ? `trucks:${avail}` : "",
      ].filter(Boolean);

      return parts.join(" ");
    });

    const context = lines.filter(Boolean).join(" | ");
    return context || "USDA truck rates present but could not be parsed";
  } catch (err) {
    console.error("USDA fetch failed", err);
    return "USDA data unavailable";
  }
}

// ---- FMCSA: Reefer carrier snapshots via QCMobile API ----
async function fetchFmcsaContext(): Promise<string> {
  if (!FMCSA_WEB_KEY || FMCSA_REEFER_DOT_LIST.length === 0) {
    return "FMCSA data unavailable";
  }

  const base = "https://mobile.fmcsa.dot.gov/qc/services";
  const summaries: string[] = [];

  for (const dot of FMCSA_REEFER_DOT_LIST) {
    try {
      const [carrierRes, cargoRes, authRes] = await Promise.all([
        fetch(`${base}/carriers/${dot}?webKey=${encodeURIComponent(FMCSA_WEB_KEY)}`),
        fetch(
          `${base}/carriers/${dot}/cargo-carried?webKey=${encodeURIComponent(FMCSA_WEB_KEY)}`,
        ),
        fetch(
          `${base}/carriers/${dot}/authority?webKey=${encodeURIComponent(FMCSA_WEB_KEY)}`,
        ),
      ]);

      if (!carrierRes.ok) {
        console.error("FMCSA carrierRes not ok", dot, carrierRes.status);
        continue;
      }

      const carrierJson = (await carrierRes.json()) as any;
      const carrier =
        carrierJson?.content?.carrier ?? carrierJson?.carrier ?? carrierJson;

      const cargoJson = cargoRes.ok ? ((await cargoRes.json()) as any) : null;
      const authJson = authRes.ok ? ((await authRes.json()) as any) : null;

      const name =
        carrier.legalName ??
        carrier.dbaName ??
        carrier.legal_name ??
        "Unknown";

      const status =
        carrier.operatingStatus ??
        carrier.opearatingStatus ??
        carrier.status ??
        "UNK";

      const powerUnits =
        carrier.totalPowerUnits ?? carrier.powerUnits ?? carrier.power_units ??
        null;
      const drivers =
        carrier.totalDrivers ?? carrier.drivers ?? carrier.driver_count ??
        null;

      const cargoList =
        cargoJson?.content?.cargoCarried ?? cargoJson?.cargoCarried ?? [];
      const hasReefer = Array.isArray(cargoList)
        ? cargoList.some((c: any) =>
          `${c.cargoCarriedDesc ?? c.description ?? ""}`
            .toLowerCase()
            .includes("refrigerated")
        )
        : false;

      const auth = authJson?.content ?? authJson ?? {};
      const authoritySummary = [
        auth.commonAuthority === "Y" ? "common" : null,
        auth.contractAuthority === "Y" ? "contract" : null,
        auth.brokerAuthority === "Y" ? "broker" : null,
      ]
        .filter(Boolean)
        .join("/");

      const summaryParts = [
        `${name} (DOT ${dot})`,
        `status:${status}`,
        hasReefer ? "reefer" : "",
        powerUnits ? `units:${powerUnits}` : "",
        drivers ? `drivers:${drivers}` : "",
        authoritySummary ? `auth:${authoritySummary}` : "",
      ].filter(Boolean);

      summaries.push(summaryParts.join(" "));
    } catch (err) {
      console.error("FMCSA fetch failed for DOT", dot, err);
    }
  }

  if (!summaries.length) return "FMCSA data unavailable";

  return summaries.join(" | ").slice(0, 800);
}

// ---- Grok-4: Generate ≤140-character lane whisper ----
async function generateLaneWhisper(
  usdaContext: string,
  fmcsaContext: string,
): Promise<string> {
  const body = {
    model: "grok-4",
    messages: [
      {
        role: "system",
        content:
          "You are an expert US refrigerated trucking market analyst. Generate one ultra-concise trading signal SMS for reefer lanes. Hard limit 140 characters. No disclaimers. No emojis. No hashtags.",
      },
      {
        role: "user",
        content:
          `USDA SC National Truck Rate context:\n${usdaContext}\n\nFMCSA reefer carrier snapshot:\n${fmcsaContext}\n\nGenerate ONE SMS <=140 characters highlighting tightening/loosening reefer lanes or pricing edge for carriers & brokers. Include origin→destination and rough rate or direction (up/down).`,
      },
    ],
    max_tokens: 80,
    temperature: 0.7,
    stream: false,
  };

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROK_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("Grok API error", res.status, await res.text());
    throw new Error("Failed to generate whisper");
  }

  const json = (await res.json()) as any;
  const raw =
    json.choices?.[0]?.message?.content ??
    json.choices?.[0]?.message?.content?.[0]?.text ??
    "";

  const text = String(raw).trim();
  if (text.length <= 140) return text;
  return text.slice(0, 137) + "...";
}

// ---- Twilio: SMS fan-out to active subscribers ----
async function sendTwilioBatch(
  subscribers: Subscriber[],
  smsText: string,
): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.warn("Twilio not fully configured, skipping SMS.");
    return;
  }

  if (!subscribers.length) {
    console.warn("No active subscribers to SMS, skipping.");
    return;
  }

  const baseUrl =
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const authHeader = "Basic " +
    btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  for (const sub of subscribers) {
    if (!sub.phone) continue;

    try {
      const raw = sub.phone.trim();
      const digits = raw.replace(/[^0-9+]/g, "");
      let to = digits;

      if (!to.startsWith("+")) {
        // Naive default to US/Canada; adjust if you have international users
        to = "+1" + digits;
      }

      const formBody = new URLSearchParams({
        To: to,
        From: TWILIO_FROM_NUMBER,
        Body: smsText,
      }).toString();

      const res = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: authHeader,
        },
        body: formBody,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(
          "Twilio send error for subscriber",
          sub.id,
          res.status,
          text,
        );
      }
    } catch (err) {
      console.error("Twilio send exception for subscriber", sub.id, err);
    }
  }
}

// ---- Main handler ----
Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Fetch external data in parallel
    const [usdaContext, fmcsaContext] = await Promise.all([
      fetchUsdaContext(),
      fetchFmcsaContext(),
    ]);

    // Generate the whisper text
    const smsText = await generateLaneWhisper(usdaContext, fmcsaContext);

    // Save whisper to DB using actual table columns
    const whisperDate = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

    const whisperRow: WhisperInsert = {
      whisper_date: whisperDate,
      body: smsText,
      source_model: "grok-4",
      raw_usda_payload: { context: usdaContext },
      raw_fmcsa_payload: { context: fmcsaContext },
    };

    const { error: whisperErr } = await supabase
      .from("whispers")
      .insert(whisperRow);

    if (whisperErr) {
      console.error("Failed to insert whisper", whisperErr);
    }

    // Pull active, paid subscribers
    const nowIso = new Date().toISOString();

    const { data: subscribers, error: subErr } = await supabase
      .from("subscribers")
      .select("id, email, phone")
      .eq("status", "active")
      .gt("paid_until", nowIso);

    if (subErr) {
      console.error("Error fetching subscribers", subErr);
    }

    // Fan-out via Twilio (if configured)
    await sendTwilioBatch(subscribers ?? [], smsText);

    return new Response(
      JSON.stringify({
        ok: true,
        smsText,
        subscribers: subscribers?.length ?? 0,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("daily-whisper error", err);
    return new Response("Internal server error", { status: 500 });
  }
});
