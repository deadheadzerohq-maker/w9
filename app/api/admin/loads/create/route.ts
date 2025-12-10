// app/api/admin/loads/create/route.ts

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { Resend } from "resend";

// Make sure we know at startup whether the key is present
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.error(
    "[loads/create] RESEND_API_KEY is not set. Emails will be skipped.",
  );
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Force Node runtime so crypto + Resend work as expected
export const runtime = "nodejs";

export async function POST(request: Request) {
  console.log("[loads/create] POST hit");

  try {
    const body = await request.json();

    const {
      reference,
      shipperName,
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
    } = body || {};

    if (!carrierEmail || !originCity || !destCity || !pickupDate) {
      console.warn(
        "[loads/create] Missing required fields:",
        JSON.stringify({
          carrierEmail,
          originCity,
          destCity,
          pickupDate,
        }),
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing required fields (carrierEmail, origin/dest, pickupDate).",
        },
        { status: 400 },
      );
    }

    const token = randomUUID();

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://deadheadzero.com";
    const normalizedBase = baseUrl.replace(/\/$/, "");
    const uploadUrl = `${normalizedBase}/carrier/load-docs/${token}`;

    // Insert load into Supabase
    const { data: load, error: insertError } = await supabaseAdmin
      .from("loads")
      .insert({
        token,
        reference,
        status: "created",
        shipper_name: shipperName,
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
        { ok: false, error: "Failed to create load" },
        { status: 500 },
      );
    }

    console.log(
      "[loads/create] Load created with id, token:",
      load.id,
      load.token,
    );

    // === Email sending via Resend ===
    if (!resend) {
      console.error(
        "[loads/create] Resend client not initialized – skipping email.",
      );
    } else {
      const laneDesc = `${originCity || "Origin"}${
        originState ? ", " + originState : ""
      } → ${destCity || "Destination"}${destState ? ", " + destState : ""}`;

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
        pickupDate ? `Pickup: ${pickupDate}` : "",
        deliveryDate ? `Delivery: ${deliveryDate}` : "",
        "",
        `Supported file types: PDF, JPG, PNG.`,
        `No login required.`,
        "",
        `Thank you,`,
        `Deadhead Zero Logistics LLC`,
      ].filter(Boolean);

      try {
        const result = await resend.emails.send({
          from: "Deadhead Zero <info@deadheadzero.com>",
          to: [carrierEmail],
          subject,
          text: textLines.join("\n"),
        });

        console.log(
          "[loads/create] Resend email result:",
          JSON.stringify(result),
        );
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
      { ok: false, error: "Unexpected error" },
      { status: 500 },
    );
  }
}
