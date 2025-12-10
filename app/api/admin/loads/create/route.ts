// app/api/admin/loads/create/route.ts

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { Resend } from "resend";

// ---- Initialize Resend ----
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.error("[loads/create] RESEND_API_KEY is not set. Emails will be skipped.");
}
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// ---- Force Node runtime ----
export const runtime = "nodejs";

// ---- Helpers ----
function formatDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildLaneDescription(
  originCity?: string | null,
  originState?: string | null,
  destCity?: string | null,
  destState?: string | null,
): string {
  const origin =
    originCity && originState
      ? `${originCity}, ${originState}`
      : originCity || originState || "Origin";
  const dest =
    destCity && destState
      ? `${destCity}, ${destState}`
      : destCity || destState || "Destination";
  return `${origin} → ${dest}`;
}

function buildHtmlEmail(params: {
  carrierName?: string | null;
  laneDesc: string;
  pickupDate?: string | null;
  deliveryDate?: string | null;
  uploadUrl: string;
}) {
  const { carrierName, laneDesc, pickupDate, deliveryDate, uploadUrl } = params;

  const pickupPretty = pickupDate ? formatDateTime(pickupDate) : null;
  const deliveryPretty = deliveryDate ? formatDateTime(deliveryDate) : null;

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Deadhead Zero – Upload Docs</title>
    </head>
    <body style="margin:0;padding:0;background:#050509;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f9fafb;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#050509;padding:24px 0;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#050509;border-radius:16px;border:1px solid #111827;box-shadow:0 24px 80px rgba(0,0,0,0.65);overflow:hidden;">
              <tr>
                <td style="padding:20px 24px;border-bottom:1px solid #111827;background:radial-gradient(circle at top, #0ea5e9 0, #020617 55%);">
                  <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#a5f3fc;margin-bottom:4px;">
                    Deadhead Zero Logistics LLC
                  </div>
                  <div style="font-size:20px;font-weight:600;color:#e5e7eb;">
                    Upload BOL / POD & Docs
                  </div>
                  <div style="font-size:13px;color:#cbd5f5;margin-top:4px;">
                    Secure upload link for your reefer load
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 12px 0;font-size:14px;color:#e5e7eb;">
                    ${carrierName ? `Hi <strong>${carrierName}</strong>,` : "Hi there,"}
                  </p>

                  <p style="margin:0 0 16px 0;font-size:14px;color:#d1d5db;line-height:1.6;">
                    Deadhead Zero has created a new load for you. Please upload all paperwork (rate confirmation, BOL, POD, lumper receipts, etc.) using the secure link below. No login required.
                  </p>

                  <p style="margin:0 0 18px 0;">
                    <a href="${uploadUrl}" style="display:inline-block;background:#0ea5e9;color:#020617;font-size:14px;font-weight:600;padding:10px 18px;border-radius:999px;text-decoration:none;">
                      Upload documents
                    </a>
                  </p>

                  <p style="margin:0 0 10px 0;font-size:13px;color:#9ca3af;">
                    Or paste this link into your browser:<br/>
                    <span style="word-break:break-all;color:#e5e7eb;">${uploadUrl}</span>
                  </p>

                  <table cellpadding="0" cellspacing="0" style="margin-top:18px;border-collapse:collapse;width:100%;">
                    <tr>
                      <td colspan="2" style="font-size:13px;font-weight:600;color:#a5f3fc;padding-bottom:6px;border-bottom:1px solid #111827;">
                        Load Details
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size:13px;color:#9ca3af;padding-top:8px;width:120px;">Lane</td>
                      <td style="font-size:13px;color:#e5e7eb;padding-top:8px;">${laneDesc}</td>
                    </tr>
                    ${
                      pickupPretty
                        ? `<tr>
                      <td style="font-size:13px;color:#9ca3af;padding-top:4px;">Pickup</td>
                      <td style="font-size:13px;color:#e5e7eb;padding-top:4px;">${pickupPretty}</td>
                    </tr>`
                        : ""
                    }
                    ${
                      deliveryPretty
                        ? `<tr>
                      <td style="font-size:13px;color:#9ca3af;padding-top:4px;">Delivery</td>
                      <td style="font-size:13px;color:#e5e7eb;padding-top:4px;">${deliveryPretty}</td>
                    </tr>`
                        : ""
                    }
                    <tr>
                      <td style="font-size:13px;color:#9ca3af;padding-top:4px;">File Types</td>
                      <td style="font-size:13px;color:#e5e7eb;padding-top:4px;">PDF, JPG, PNG</td>
                    </tr>
                  </table>

                  <p style="margin:18px 0 0 0;font-size:12px;color:#6b7280;line-height:1.6;">
                    If you weren’t expecting this email, you can ignore it. Deadhead Zero Logistics is a licensed freight broker and technology platform. This link only allows document upload for this specific load.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:14px 24px;border-top:1px solid #111827;background:#020617;font-size:11px;color:#6b7280;">
                  © ${new Date().getFullYear()} Deadhead Zero Logistics LLC · info@deadheadzero.com
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

export async function POST(request: Request) {
  console.log("[loads/create] POST hit");

  try {
    const body = await request.json();

    const {
      reference,
      shipperName,
      shipperEmail,   // NEW: for CC
      receiverName,
      originCity,
      originState,
      destCity,
      destState,
      pickupDate,
      deliveryDate,
      carrierName,
      carrierEmail,
      rate,
      rateConUrl,     // NEW: optional URL to rate-con PDF
    } = body || {};

    if (!carrierEmail || !originCity || !destCity || !pickupDate) {
      console.warn("[loads/create] Missing required fields:", {
        carrierEmail,
        originCity,
        destCity,
        pickupDate,
      });

      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 },
      );
    }

    const token = randomUUID();

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://deadheadzero.com";
    const normalizedBase = baseUrl.replace(/\/$/, "");
    const uploadUrl = `${normalizedBase}/carrier/load-docs/${token}`;

    const { data: load, error: insertError } = await supabaseAdmin
      .from("loads")
      .insert({
        token,
        reference,
        status: "created",
        shipper_name: shipperName,
        shipper_email: shipperEmail || null,
        receiver_name: receiverName,
        origin_city: originCity,
        origin_state: originState,
        dest_city: destCity,
        dest_state: destState,
        pickup_date: pickupDate || null,
        delivery_date: deliveryDate || null,
        carrier_name: carrierName,
        carrier_email: carrierEmail,
        rate,
        upload_link: uploadUrl,
      })
      .select("id, token")
      .single();

    if (insertError || !load) {
      console.error("[loads/create] Supabase insert error:", insertError);
      return NextResponse.json(
        { ok: false, error: "Failed to create load." },
        { status: 500 },
      );
    }

    console.log("[loads/create] Load created:", {
      loadId: load.id,
      token: load.token,
    });

    // ---- Email via Resend ----
    if (!resend) {
      console.error("[loads/create] Resend not initialized – skipping email.");
    } else {
      const laneDesc = buildLaneDescription(
        originCity,
        originState,
        destCity,
        destState,
      );

      const subject = `Upload BOL/POD for load ${
        reference || load.id
      } – Deadhead Zero`;

      const textLines = [
        carrierName ? `Hi ${carrierName},` : "Hi,",
        "",
        `Please upload all documents for your load via this secure link:`,
        uploadUrl,
        "",
        `Lane: ${laneDesc}`,
        pickupDate ? `Pickup: ${formatDateTime(pickupDate)}` : "",
        deliveryDate ? `Delivery: ${formatDateTime(deliveryDate)}` : "",
        "",
        `Supported file types: PDF, JPG, PNG.`,
        `No login required.`,
        "",
        `Thank you,`,
        `Deadhead Zero Logistics LLC`,
      ].filter(Boolean);

      // Optional PDF attachment if rateConUrl is provided
      let attachments: { filename: string; content: string }[] | undefined;

      if (rateConUrl) {
        try {
          console.log("[loads/create] Fetching rate-con PDF from:", rateConUrl);
          const res = await fetch(rateConUrl);
          if (!res.ok) {
            throw new Error(
              `Failed to fetch rateConUrl (status ${res.status})`,
            );
          }
          const arrayBuf = await res.arrayBuffer();
          const base64 = Buffer.from(arrayBuf).toString("base64");
          attachments = [
            {
              filename: "rate-confirmation.pdf",
              content: base64,
            },
          ];
        } catch (err) {
          console.error("[loads/create] rateConUrl attachment error:", err);
        }
      }

      try {
        const result = await resend.emails.send({
          from: "Deadhead Zero <info@deadheadzero.com>",
          to: [carrierEmail],
          cc: shipperEmail ? [shipperEmail] : undefined,
          subject,
          text: textLines.join("\n"),
          html: buildHtmlEmail({
            carrierName,
            laneDesc,
            pickupDate,
            deliveryDate,
            uploadUrl,
          }),
          attachments,
        });

        console.log("[loads/create] Resend email result:", result);
      } catch (err) {
        console.error("[loads/create] Resend email error:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      loadId: load.id,
      token,
      uploadUrl,
    });
  } catch (error) {
    console.error("[loads/create] unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error." },
      { status: 500 },
    );
  }
}
