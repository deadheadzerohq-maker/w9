// lib/emailHelpers.ts

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Deadhead Zero <no-reply@yourdomain.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.com";

if (!RESEND_API_KEY) {
  console.warn("[emailHelpers] RESEND_API_KEY is not set – emails will fail.");
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export type CarrierUploadEmailParams = {
  carrierEmail: string;
  carrierName?: string | null;
  shipperName?: string | null;
  shipperEmail?: string | null;
  uploadToken: string;
  loadSummary?: string | null;
};

export function buildUploadUrl(uploadToken: string) {
  // This must match your carrier doc page:
  // app/carrier/load-docs/[token]/page.tsx
  return `${SITE_URL}/carrier/load-docs/${encodeURIComponent(uploadToken)}`;
}

export async function sendCarrierUploadEmail(
  params: CarrierUploadEmailParams
): Promise<{ ok: boolean; error?: string }> {
  const {
    carrierEmail,
    carrierName,
    shipperName,
    shipperEmail,
    uploadToken,
    loadSummary,
  } = params;

  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const uploadUrl = buildUploadUrl(uploadToken);

  const subject =
    loadSummary && loadSummary.trim().length > 0
      ? `Document upload link – ${loadSummary}`
      : "Document upload link – Deadhead Zero Logistics";

  const greetingName = carrierName || "Carrier";

  const shipperLine =
    shipperName || shipperEmail
      ? `This is for a load from ${shipperName || ""} ${
          shipperEmail ? `(${shipperEmail})` : ""
        }.`
      : "";

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #0f172a; line-height: 1.5;">
      <p>Hi ${greetingName},</p>
      <p>
        Deadhead Zero Logistics is requesting upload of your load documents (rate confirmation, BOL, POD, lumper receipts, etc.).
      </p>
      ${
        shipperLine
          ? `<p>${shipperLine}</p>`
          : ""
      }
      ${
        loadSummary
          ? `<p><strong>Load:</strong> ${loadSummary}</p>`
          : ""
      }
      <p>
        Please use the secure link below to upload your documents:
      </p>
      <p>
        <a href="${uploadUrl}" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#22c55e;color:#022c22;text-decoration:none;font-weight:600;">
          Upload documents
        </a>
      </p>
      <p style="font-size:12px;color:#64748b;margin-top:16px;">
        Or copy and paste this URL into your browser:<br/>
        <span style="word-break:break-all;">${uploadUrl}</span>
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />
      <p style="font-size:11px;color:#94a3b8;">
        Deadhead Zero Logistics LLC – technology platform only, not a bank or escrow. Documents are used for invoicing and fraud checks.
      </p>
    </div>
  `;

  try {
    const sendResult = await resend.emails.send({
      from: EMAIL_FROM,
      to: [carrierEmail],
      cc: shipperEmail ? [shipperEmail] : undefined,
      subject,
      html,
    });

    console.log("[emailHelpers] Resend send result:", sendResult);

    // Resend returns id or error; we treat presence of `error` as failure.
    // @ts-ignore – not typed strictly in all setups
    if ((sendResult as any)?.error) {
      // @ts-ignore
      const errMsg = (sendResult as any).error?.message || "Unknown Resend error";
      return { ok: false, error: errMsg };
    }

    return { ok: true };
  } catch (err: any) {
    console.error("[emailHelpers] Error sending carrier email:", err);
    return { ok: false, error: err?.message || "Unknown email error" };
  }
}
