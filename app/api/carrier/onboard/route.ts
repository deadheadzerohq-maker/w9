// app/api/carrier/onboard/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ---- Supabase admin client (server-side only) ----
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// ---- Types matching what the frontend sends ----
type CarrierDocInput = {
  docType: string;            // "COI" | "W9" | "AUTHORITY" | "OTHER"
  fileUrl: string;
  originalFilename?: string;
  mimeType?: string;
};

type CarrierOnboardPayload = {
  legalName: string;
  dbaName?: string;
  mcNumber?: string;
  dotNumber?: string;
  email: string;
  phone: string;
  equipmentType?: string;
  preferredLanes?: string;
  documents: CarrierDocInput[];
};

// ---- Main handler ----
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CarrierOnboardPayload;

    if (!body.legalName || !body.email || !body.phone) {
      return NextResponse.json(
        { error: "Missing required fields (legalName, email, phone)." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.documents) || body.documents.length === 0) {
      return NextResponse.json(
        { error: "At least one document is required." },
        { status: 400 }
      );
    }

    // 1) Insert carrier row (pending)
    const { data: carrier, error: carrierError } = await supabase
      .from("carriers")
      .insert({
        legal_name: body.legalName,
        dba_name: body.dbaName || null,
        mc_number: body.mcNumber || null,
        dot_number: body.dotNumber || null,
        email: body.email,
        phone: body.phone,
        equipment_type: body.equipmentType || null,
        preferred_lanes: body.preferredLanes || null,
        status: "pending",
      })
      .select("*")
      .single();

    if (carrierError || !carrier) {
      console.error("Error inserting carrier:", carrierError);
      return NextResponse.json(
        { error: "Failed to create carrier record." },
        { status: 500 }
      );
    }

    // 2) Insert documents
    const docsToInsert = body.documents.map((doc) => ({
      carrier_id: carrier.id,
      doc_type: doc.docType,
      file_url: doc.fileUrl,
      original_filename: doc.originalFilename || null,
      mime_type: doc.mimeType || null,
    }));

    const { error: docsError } = await supabase
      .from("carrier_documents")
      .insert(docsToInsert);

    if (docsError) {
      console.error("Error inserting carrier documents:", docsError);
      // Not fatal – we still proceed with Grok and return ok.
    }

    // 3) Grok fraud / risk analysis (non-fatal if it fails)
    try {
      const grokResult = await runGrokFraudCheck({
        carrier,
        documents: body.documents,
      });

      if (grokResult) {
        const { riskScore, riskLabel, summary } = grokResult;
        const { error: updateError } = await supabase
          .from("carriers")
          .update({
            grok_risk_score: riskScore,
            grok_risk_label: riskLabel,
            grok_summary: summary,
          })
          .eq("id", carrier.id);

        if (updateError) {
          console.error("Error saving Grok fraud summary:", updateError);
        }
      }
    } catch (err) {
      console.error("Grok fraud analysis failed (non-fatal):", err);
    }

    return NextResponse.json({ ok: true, carrierId: carrier.id });
  } catch (err) {
    console.error("carrier/onboard fatal error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ---- Grok integration helpers --------------------------------------------

type GrokFraudCheckInput = {
  carrier: any;
  documents: CarrierDocInput[];
};

async function runGrokFraudCheck(
  input: GrokFraudCheckInput
): Promise<
  | {
      riskScore: number;
      riskLabel: string;
      summary: string;
    }
  | null
> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    console.warn("GROK_API_KEY not set; skipping fraud analysis.");
    return null;
  }

  const { carrier, documents } = input;

  const docList = documents
    .map(
      (d) =>
        `${d.docType}: ${d.originalFilename || "file"} (${d.mimeType || "?"})`
    )
    .join("\n");

  const prompt = `
You are a senior carrier compliance & fraud analyst for a U.S. freight brokerage.
You are given carrier registration metadata and a list of uploaded documents (COI, W9, authority, etc.).
You do NOT see the actual PDF contents, only the metadata and file list, but you know what a complete, legitimate carrier packet typically looks like.

Carrier data:
- Legal name: ${carrier.legal_name}
- DBA: ${carrier.dba_name || "N/A"}
- MC: ${carrier.mc_number || "N/A"}
- DOT: ${carrier.dot_number || "N/A"}
- Email: ${carrier.email}
- Phone: ${carrier.phone}
- Equipment type: ${carrier.equipment_type || "N/A"}
- Preferred lanes: ${carrier.preferred_lanes || "N/A"}

Uploaded documents (metadata only):
${docList}

Tasks:
1) Evaluate whether this looks like a complete, normal carrier packet.
2) Note any missing documents (e.g., no COI, no W9, no proof of authority).
3) Note any obvious red flags based ONLY on metadata (e.g., no MC/DOT, email domain mismatch, no contact info, strange document types).
4) Give a fraud / risk score from 0–100 (0 = very safe, 100 = very high risk).
5) Map the score to a risk label:
   - 0–29: "low"
   - 30–69: "medium"
   - 70–100: "high"

Respond ONLY with valid JSON in this exact shape:

{
  "riskScore": 0-100,
  "riskLabel": "low" | "medium" | "high",
  "summary": "3-6 short bullet points summarizing findings and missing items"
}
`;

  const parsed = await callGrokJSON(prompt, apiKey);

  const riskScore = Number(parsed.riskScore ?? 50);
  const riskLabel = String(parsed.riskLabel ?? "medium");
  const summary = String(parsed.summary ?? "No summary provided.");

  return { riskScore, riskLabel, summary };
}

async function callGrokJSON(prompt: string, apiKey: string) {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-2-latest", // adjust if you're on a different Grok model
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Grok API error ${res.status}: ${text}`);
  }

  const json = await res.json();

  const rawContent =
    json?.choices?.[0]?.message?.content ??
    json?.choices?.[0]?.text ??
    null;

  if (!rawContent) {
    throw new Error("Grok returned no content");
  }

  // We told Grok to output strict JSON.
  // If it misbehaves, this will throw and we treat it as non-fatal.
  try {
    return JSON.parse(rawContent);
  } catch (e) {
    console.error("Failed to parse Grok JSON:", e, rawContent);
    throw new Error("Invalid JSON from Grok");
  }
}
