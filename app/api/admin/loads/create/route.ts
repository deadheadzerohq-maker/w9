// app/api/admin/loads/create/route.ts

import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import { formatDateTime } from "@/lib/emailHelpers";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const resend =
  process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.length > 0
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

function getBaseUrl(req: NextRequest) {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase && envBase.length > 0) return envBase.replace(/\/+$/, "");

  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

// Local helper to build a lane string from a load row
function buildLaneFromLoad(load: any): string {
  const origin = `${load.origin_city || ""}${
    load.origin_state ? ", " + load.origin_state : ""
  }`.trim();

  const dest = `${load.dest_city || ""}${
    load.dest_state ? ", " + load.dest_state : ""
  }`.trim();

  if (!origin && !dest) return "Unknown lane";
  return `${origin || "Origin"} → ${dest || "Destination"}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      reference,
      shipperName,
      shipperEmail,
      receiverName,
      originCity,
      originState,
      destCity,
      destState,
      pickupDate, // ISO date string from form
      deliveryDate, // ISO date string from form
      carrierName,
      carrierEmail,
      rate, // number or string
      rateConUrl,
    } = body || {};

    if (!carrierEmail || !carrierName) {
      return NextResponse.json(
        { ok: false, error: "Carrier name and email are required." },
        { status: 400 },
      );
    }

    if (!shipperName) {
      return NextResponse.json(
        { ok: false, error: "Shipper name is required." },
        { status: 400 },
      );
    }

    const pickupDateIso = pickupDate ? new Date(pickupDate).toISOString() : null;
    const deliveryDateIso = deliveryDate
      ? new Date(deliveryDate).toISOString()
      : null;

    if (pickupDate && Number.isNaN(new Date(pickupDate).getTime())) {
      return NextResponse.json(
        { ok: false, error: "Invalid pickup date." },
        { status: 400 },
      );
    }
    if (deliveryDate && Number.isNaN(new Date(deliveryDate).getTime())) {
      return NextResponse.json(
        { ok: false, error: "Invalid delivery date." },
        { status: 400 },
      );
    }

    const numericRate =
      rate !== null && rate !== undefined && rate !== ""
        ? Number(rate)
        : null;
    if (
      numericRate !== null &&
      (Number.isNaN(numericRate) || !Number.isFinite(numericRate))
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid rate amount." },
        { status: 400 },
      );
    }

    const token = randomUUID();
    const baseUrl = getBaseUrl(req);
    const uploadLink = `${baseUrl}/carrier/load-docs/${token}`;

    // Insert load row
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("loads")
      .insert({
        token,
        reference: reference || null,
        status: "created",
        shipper_name: shipperName,
        shipper_email: shipperEmail || null,
        receiver_name: receiverName || null,
        origin_city: originCity || null,
        origin_state: originState || null,
        dest_city: destCity || null,
        dest_state: destState || null,
        pickup_date: pickupDateIso,
        delivery_date: deliveryDateIso,
        carrier_name: carrierName,
        carrier_email: carrierEmail,
        rate: numericRate,
        upload_link: uploadLink,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Error inserting load:", insertError);
      // Surface the real Postgres/Supabase error so we can see it in the UI
      return NextResponse.json(
        {
          ok: false,
          error: "Supabase insert error",
          supabase: {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code,
          },
        },
        { status: 500 },
      );
    }

    const load = inserted;

    // Lane + dates for email copy
    const lane = buildLaneFromLoad(load);
    const prettyPickup = formatDateTime(load.pickup_date);
    const prettyDelivery = formatDateTime(load.delivery_date);

    let emailError: string | null = null;

    if (resend) {
      try {
        const subject = `Documents needed for load ${
          load.reference || load.id
        } – Deadhead Zero`;

        const text = [
          `Carrier: ${load.carrier_name || ""}`,
          `Lane: ${lane}`,
          `Pickup: ${prettyPickup}`,
          `Delivery: ${prettyDelivery}`,
          "",
          `Please upload BOL, POD, and rate confirmation for this load:`,
          uploadLink,
        ].join("\n");

        const html = `
          <div style="background:#020617;color:#e5e7eb;padding:24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <div style="max-width:640px;margin:0 auto;border-radius:16px;border:1px solid #1f2937;background:#020617;padding:24px;">
              <h1 style="font-size:20px;margin:0 0 8px;font-weight:600;">Deadhead Zero – Load Documents Requested</h1>
              <p style="margin:0 0 16px;color:#9ca3af;font-size:14px;">
                We created a new load and need your documents to get this moved and paid quickly.
              </p>

              <div style="border-radius:12px;border:1px solid #1f2937;background:#020617;padding:16px;margin-bottom:16px;">
                <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Load reference</p>
                <p style="margin:0 0 8px;font-size:14px;">${
                  load.reference || `#${load.id}`
                }</p>
                <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Lane</p>
                <p style="margin:0 0 8px;font-size:14px;">${lane}</p>
                <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Pickup / Delivery</p>
                <p style="margin:0;font-size:14px;">${prettyPickup} → ${prettyDelivery}</p>
              </div>

              <p style="margin:0 0 12px;font-size:14px;">
                Please upload your <strong>BOL</strong>, <strong>POD</strong>, and <strong>rate confirmation</strong> at the link below:
              </p>

              <p style="margin:0 0 16px;">
                <a href="${uploadLink}" style="display:inline-block;padding:10px 16px;border-radius:9999px;background:#22d3ee;color:#020617;font-size:14px;font-weight:500;text-decoration:none;">
                  Upload documents
                </a>
              </p>

              <p style="margin:0;font-size:12px;color:#6b7280;">
                If the button doesn&apos;t work, copy and paste this URL into your browser:<br/>
                <span style="color:#e5e7eb;font-family:monospace;font-size:12px;">${uploadLink}</span>
              </p>

              <p style="margin-top:24px;font-size:11px;color:#4b5563;">
                Deadhead Zero Logistics LLC – Technology platform only. We do not handle customer funds.
              </p>
            </div>
          </div>
        `;

        const to: string[] = [carrierEmail];
        if (shipperEmail) to.push(shipperEmail);

        const { error: resendError } = await resend.emails.send({
          from: "Deadhead Zero <info@deadheadzero.com>",
          to,
          subject,
          text,
          html,
        });

        if (resendError) {
          console.error(
            "Resend error sending load creation email:",
            resendError,
          );
          emailError = "Load created, but failed to send email.";
        }
      } catch (err: any) {
        console.error("Unexpected Resend error:", err);
        emailError = "Load created, but failed to send email.";
      }
    } else {
      console.warn("RESEND_API_KEY not configured; skipping email send.");
      emailError = "Load created, but email service is not configured.";
    }

    return NextResponse.json(
      {
        ok: true,
        load,
        uploadLink,
        emailError,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Unexpected error in /api/admin/loads/create:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected server error while creating load.",
      },
      { status: 500 },
    );
  }
}
