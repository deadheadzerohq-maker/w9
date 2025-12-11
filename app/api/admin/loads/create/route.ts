// app/api/admin/loads/create/route.ts

import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import { buildLaneDescription, formatDateTime } from "@/lib/emailHelpers";

export const runtime = "nodejs";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function toIsoFromLocalDateTime(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      reference,
      shipperName,
      shipperEmail,
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
    } = body as {
      reference?: string | null;
      shipperName?: string | null;
      shipperEmail?: string | null;
      receiverName?: string | null;
      originCity?: string | null;
      originState?: string | null;
      destCity?: string | null;
      destState?: string | null;
      pickupDate?: string | null;
      deliveryDate?: string | null;
      carrierName?: string | null;
      carrierEmail?: string | null;
      rate?: number | null;
    };

    if (!originCity || !destCity || !pickupDate || !carrierEmail) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "originCity, destCity, pickupDate, and carrierEmail are required.",
        },
        { status: 400 },
      );
    }

    // Generate token + upload URL
    const token = crypto.randomUUID();

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      "";

    const origin =
      baseUrl && baseUrl.startsWith("http")
        ? baseUrl
        : baseUrl
          ? `https://${baseUrl}`
          : "";

    const uploadUrl = origin
      ? `${origin}/carrier/load-docs/${encodeURIComponent(token)}`
      : `/carrier/load-docs/${encodeURIComponent(token)}`;

    const pickupIso = toIsoFromLocalDateTime(pickupDate || null);
    const deliveryIso = toIsoFromLocalDateTime(deliveryDate || null);

    // Insert load
    const { data, error } = await supabaseAdmin
      .from("loads")
      .insert({
        reference: reference || null,
        token,
        status: "created",
        shipper_name: shipperName || null,
        shipper_email: shipperEmail || null,
        receiver_name: receiverName || null,
        origin_city: originCity,
        origin_state: originState || null,
        dest_city: destCity,
        dest_state: destState || null,
        pickup_date: pickupIso,
        delivery_date: deliveryIso,
        carrier_name: carrierName || null,
        carrier_email: carrierEmail || null,
        rate: rate ?? null,
        upload_link: uploadUrl,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("[loads/create] Supabase insert error:", error);
      return NextResponse.json(
        { ok: false, error: "Supabase insert error" },
        { status: 500 },
      );
    }

    const lane = buildLaneDescription({
      origin_city: data.origin_city,
      origin_state: data.origin_state,
      dest_city: data.dest_city,
      dest_state: data.dest_state,
    });

    const pickupPretty = formatDateTime(data.pickup_date);
    const deliveryPretty = data.delivery_date
      ? formatDateTime(data.delivery_date)
      : null;

    let emailSent = false;
    let emailError: string | null = null;

    if (!resend) {
      console.warn(
        "[loads/create] RESEND_API_KEY not set, skipping upload email.",
      );
      emailError = "RESEND_API_KEY is not configured in Vercel env vars.";
    } else {
      const subjectRef = data.reference || `Load #${data.id}`;
      const to: string[] = [];
      if (carrierEmail) to.push(carrierEmail);

      const cc: string[] = [];
      if (shipperEmail) cc.push(shipperEmail);

      if (to.length > 0) {
        try {
          const htmlParts: string[] = [];

          htmlParts.push(
            `<div style="background:#020617;padding:24px;color:#e5e7eb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">`,
          );
          htmlParts.push(
            `<h1 style="font-size:20px;font-weight:600;margin:0 0 12px">Documents requested for ${subjectRef}</h1>`,
          );
          htmlParts.push(
            `<p style="font-size:13px;line-height:1.5;margin:0 0 8px">Deadhead Zero Logistics LLC has created a new load and is requesting documents for the lane:</p>`,
          );
          htmlParts.push(
            `<p style="font-size:13px;line-height:1.5;margin:0 0 4px"><strong>${lane}</strong></p>`,
          );
          if (pickupPretty) {
            htmlParts.push(
              `<p style="font-size:12px;line-height:1.5;margin:0 0 2px">Pickup: ${pickupPretty}</p>`,
            );
          }
          if (deliveryPretty) {
            htmlParts.push(
              `<p style="font-size:12px;line-height:1.5;margin:0 0 10px">Delivery: ${deliveryPretty}</p>`,
            );
          }
          htmlParts.push(
            `<p style="font-size:13px;line-height:1.5;margin:0 0 12px">Please upload your BOL, POD, and rate confirmation documents at the secure link below:</p>`,
          );
          htmlParts.push(
            `<p style="margin:0 0 16px"><a href="${uploadUrl}" style="display:inline-block;background:#22c55e;color:#020617;font-size:13px;font-weight:500;padding:8px 16px;border-radius:999px;text-decoration:none">Open secure upload portal</a></p>`,
          );
          htmlParts.push(
            `<p style="font-size:11px;color:#9ca3af;margin:0 0 2px">If the button doesn’t work, paste this URL into your browser:</p>`,
          );
          htmlParts.push(
            `<p style="font-size:11px;color:#a5b4fc;margin:0 0 16px;word-break:break-all">${uploadUrl}</p>`,
          );
          htmlParts.push(
            `<p style="font-size:10px;color:#6b7280;margin:0 0 2px">Deadhead Zero Logistics LLC · 5532 N 192nd Lane · Litchfield Park, Arizona 85340 US</p>`,
          );
          htmlParts.push(
            `<p style="font-size:10px;color:#4b5563;margin:0">Technology platform only. Deadhead Zero is a licensed broker (MC 1782185 · DOT 4504032) but does not hold freight funds in escrow.</p>`,
          );
          htmlParts.push(`</div>`);

          await resend.emails.send({
            from: "Deadhead Zero <info@deadheadzero.com>",
            to,
            cc: cc.length ? cc : undefined,
            subject: `Documents requested for ${subjectRef} – Deadhead Zero`,
            text: [
              `Deadhead Zero Logistics LLC has created a new load and is requesting documents.`,
              "",
              `Lane: ${lane}`,
              pickupPretty ? `Pickup: ${pickupPretty}` : "",
              deliveryPretty ? `Delivery: ${deliveryPretty}` : "",
              "",
              `Please upload BOL, POD, and rate confirmation at this secure link:`,
              uploadUrl,
            ]
              .filter(Boolean)
              .join("\n"),
            html: htmlParts.join(""),
          });

          emailSent = true;
        } catch (err: any) {
          console.error("[loads/create] Error sending upload email:", err);
          emailError =
            err?.message || "Error sending upload email via Resend API.";
        }
      } else {
        emailError = "No carrier email present to send upload link.";
      }
    }

    return NextResponse.json(
      {
        ok: true,
        loadId: data.id,
        token: data.token,
        uploadUrl,
        emailSent,
        emailError,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[loads/create] Unexpected error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unexpected server error",
      },
      { status: 500 },
    );
  }
}
