// app/api/admin/loads/create/route.ts

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export async function POST(request: Request) {
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
      return NextResponse.json(
        {
          ok: false,
          error: "Missing required fields (carrierEmail, origin/dest, pickupDate).",
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
      console.error("loads/create insert error:", insertError);
      return NextResponse.json(
        { ok: false, error: "Failed to create load" },
        { status: 500 },
      );
    }

    // Fire-and-forget email to carrier with upload link (non-fatal if it fails)
    if (process.env.RESEND_API_KEY) {
      const laneDesc = `${originCity || "Origin"}${
        originState ? ", " + originState : ""
      } → ${destCity || "Destination"}${
        destState ? ", " + destState : ""
      }`;

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

      resend.emails
        .send({
          from: "Deadhead Zero <no-reply@deadheadzero.com>",
          to: [carrierEmail],
          subject,
          text: textLines.join("\n"),
        })
        .catch((err) => {
          console.error("loads/create email error (non-fatal):", err);
        });
    } else {
      console.warn(
        "RESEND_API_KEY not set; skipping carrier upload-link email.",
      );
    }

    return NextResponse.json({
      ok: true,
      loadId: load.id,
      token,
      uploadUrl,
    });
  } catch (error) {
    console.error("loads/create unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 },
    );
  }
}
