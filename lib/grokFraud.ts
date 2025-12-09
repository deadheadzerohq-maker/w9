// app/lib/grokFraud.ts
// @ts-nocheck

/**
 * runGrokFraudCheck()
 *
 * Sends carrier onboarding data + document metadata to Grok (x.ai)
 * to generate a fraud / compliance risk score.
 *
 * ALWAYS returns a stable object:
 * {
 *   riskScore: number,
 *   riskLabel: "low" | "medium" | "high",
 *   summary: string
 * }
 *
 * If Grok fails or returns non-JSON, we fallback to:
 *   { riskScore: 50, riskLabel: "medium", summary: "LLM_ERROR" }
 */

export async function runGrokFraudCheck(payload: {
  legalName: string;
  dbaName?: string;
  mcNumber: string;
  dotNumber: string;
  email: string;
  phone: string;

  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  remitAddress?: string;

  taxId?: string;
  primaryContactName?: string;
  primaryContactTitle?: string;
  dispatchPhone?: string;
  afterHoursPhone?: string;

  equipmentType?: string;
  preferredLanes?: string;
  fleetSize?: number | null;

  factoringCompanyName?: string;
  factoringContactEmail?: string;
  factoringContactPhone?: string;
  paymentTerms?: string;
  operatingRegions?: string;

  documents: {
    docType: string;
    fileUrl: string;
    originalFilename: string;
    mimeType: string;
  }[];
}) {
  const apiKey =
    process.env.GROK_API_KEY ||
    process.env.XAI_API_KEY ||
    Deno?.env?.get?.("GROK_API_KEY") ||
    "";

  if (!apiKey) {
    console.error("Missing GROK_API_KEY — returning fallback fraud result.");
    return {
      riskScore: 50,
      riskLabel: "medium",
      summary: "Missing GROK_API_KEY",
    };
  }

  // Construct prompt
  const systemPrompt = `
You are an expert carrier compliance and onboarding auditor for a U.S. FMCSA-licensed freight brokerage.
Your job is to detect missing documents, mismatched identity information, suspicious patterns, fraud indicators,
and general onboarding completeness.

You must ALWAYS return STRICT JSON in this EXACT shape:

{
  "riskScore": 0-100,
  "riskLabel": "low" | "medium" | "high",
  "summary": "3-8 short bullet points describing your reasoning"
}

Risk scoring guidelines:
- 0-25  = very low risk (clean paperwork, all documents present)
- 26-50 = moderate / acceptable
- 51-75 = elevated concern (missing docs, mismatched MC/DOT, unverifiable address)
- 76-100 = high risk (fraud indicators, fake COI/W9 filenames, inconsistent identity, bad MC history)

`;

  const userPrompt = `
Carrier metadata:
${JSON.stringify(payload, null, 2)}

Documents provided:
${JSON.stringify(payload.documents, null, 2)}

Return only the JSON object. No commentary. No extra text.
`;

  try {
    const resp = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-2-latest",
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      console.error("Grok API error:", await resp.text());
      return {
        riskScore: 50,
        riskLabel: "medium",
        summary: "LLM_ERROR_NON_200",
      };
    }

    const data = await resp.json();

    const raw = data?.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      console.error("No Grok message.content returned:", data);
      return {
        riskScore: 50,
        riskLabel: "medium",
        summary: "LLM_EMPTY_RESPONSE",
      };
    }

    // Extract JSON (some LLMs wrap output with ```json)
    const jsonStr = raw.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(jsonStr);

      if (
        typeof parsed.riskScore === "number" &&
        typeof parsed.riskLabel === "string" &&
        typeof parsed.summary === "string"
      ) {
        return parsed;
      }

      console.error("Parsed JSON missing required fields:", parsed);

      return {
        riskScore: 50,
        riskLabel: "medium",
        summary: "LLM_JSON_SHAPE_INVALID",
      };
    } catch (err) {
      console.error("Error parsing Grok JSON:", err, raw);
      return {
        riskScore: 50,
        riskLabel: "medium",
        summary: "LLM_JSON_PARSE_FAILURE",
      };
    }
  } catch (err) {
    console.error("Grok fraud check fetch error:", err);
    return {
      riskScore: 50,
      riskLabel: "medium",
      summary: "GROK_FETCH_ERROR",
    };
  }
}
