// app/api/admin/loads/create/route.ts

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://deadheadzero.com";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL =
  process.env.DZ_FROM_EMAIL || "Deadhead Zero <info@deadheadzero.com>";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

type NewLoadPayload = {
  reference?: string | null;
  shipper_name?: string | null;
  receiver_name?: string | null;
  origin_city?: string | null;
  origin_state?: string | null;
  dest_city?: string | null;
  dest_state?: string | null;
  pickup_date?: string | null; // ISO date string
  delivery_date?: string | null; // ISO date string
  carrier_name?: string | null;
  carrier_email?: string | null;
  rate?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as NewLoadPayload;

    const {
      reference,
      shipper_name,
      receiver_name,
      origin_city,
      origin_state,
      dest_city,
      dest_state,
      pickup_date,
      delivery_date,
      carrier_name,
      carrier_email,
      rate,
    } = body;

    if (!carrier_email || !carrier_name) {
      return NextResponse.json(
        {
          ok: false,
          error: "Carrier name and carrier email are required.",
        },
        { status: 400 },
      );
    }

    if (!origin_city || !dest_city) {
      return NextResponse.json(
        {
          ok: false,
          error: "Origin and destination cities are required.",
        },
        { status: 400 },
      );
    }

    const token = crypto.randomUUID();
    const uploadToken = token;
    const uploadLink = `${SITE_URL}/carrier/load-docs/${encodeURIComponent(
      uploadToken,
    )}`;

    const { data: load, error: insertError } = await supabaseAdmin
      .from("loads")
      .insert({
        token,
        upload_token: uploadToken,
        upload_link: uploadLink,
        reference: reference || null,
        shipper_name: shipper_name || null,
        receiver_name: receiver_name || null,
        origin_city,
        origin_state: origin_state || null,
        dest_city,
        dest_state: dest_state || null,
        pickup_date: pickup_date || null,
        delivery_date: delivery_date || null,
        carrier_name,
        carrier_email,
        rate: rate || null,
        status: "created",
      })
      .select("*")
      .single();

    if (insertError || !load) {
      console.error("Error inserting load:", insertError);
      return NextResponse.json(
        {
          ok: false,
          error:
            "Failed to create load: " +
            (insertError?.message ||
              insertError?.details ||
              "Unknown database error"),
        },
        { status: 500 },
      );
    }

    // --- Fire-and-forget carrier email via Resend ---
    if (!RESEND_API_KEY || !resend) {
      console.warn(
        "RESEND_API_KEY not configured; skipping carrier email for load",
        load.id,
      );
    } else {
      try {
        const lane = `${origin_city}${
          origin_state ? ", " + origin_state : ""
        } → ${dest_city}${dest_state ? ", " + dest_state : ""}`;

        const subject = `Upload documents for load ${lane}${
          reference ? ` (Ref ${reference})` : ""
        }`;

        const text = [
          `Hi ${carrier_name},`,
          "",
          `Deadhead Zero has created a new load for you:`,
          `Lane: ${lane}`,
          reference ? `Reference: ${reference}` : "",
          pickup_date ? `Pickup: ${pickup_date}` : "",
          delivery_date ? `Delivery: ${delivery_date}` : "",
          rate ? `Rate: $${rate}` : "",
          "",
          "Please use the secure link below to upload your BOL, POD, Rate Confirmation, and other documents:",
          uploadLink,
          "",
          "Thank you,",
          "Deadhead Zero Logistics Ops",
        ]
          .filter(Boolean)
          .join("\n");

        const html = `
          <p>Hi ${carrier_name},</p>
          <p>Deadhead Zero has created a new load for you:</p>
          <ul>
            <li><strong>Lane:</strong> ${lane}</li>
            ${
              reference
                ? `<li><strong>Reference:</strong> ${reference}</li>`
                : ""
            }
            ${
              pickup_date
                ? `<li><strong>Pickup:</strong> ${pickup_date}</li>`
                : ""
            }
            ${
              delivery_date
                ? `<li><strong>Delivery:</strong> ${delivery_date}</li>`
                : ""
            }
            ${rate ? `<li><strong>Rate:</strong> $${rate}</li>` : ""}
          </ul>
          <p>Please use the secure link below to upload your BOL, POD, Rate Confirmation, and other documents:</p>
          <p><a href="${uploadLink}">${uploadLink}</a></p>
          <p>Thank you,<br/>Deadhead Zero Logistics Ops</p>
        `;

        await resend.emails.send({
          from: FROM_EMAIL,
          to: carrier_email,
          subject,
          text,
          html,
        });
      } catch (emailErr) {
        console.error("Error sending carrier email via Resend:", emailErr);
        // Do NOT fail the request if email sending fails
      }
    }

    return NextResponse.json({ ok: true, load }, { status: 200 });
  } catch (err: any) {
    console.error("Fatal error in /api/admin/loads/new:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unexpected error creating load: " + (err?.message || String(err)),
      },
      { status: 500 },
    );
  }
}
