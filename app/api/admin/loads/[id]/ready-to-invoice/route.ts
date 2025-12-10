// app/api/admin/loads/[id]/ready-to-invoice/route.ts

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import { formatDateTime, buildLaneDescription } from "@/lib/emailHelpers";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const runtime = "nodejs";

type Params = {
  params: { id: string };
};

export async function POST(req: Request, { params }: Params) {
  const id = Number(params.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid load id" },
      { status: 400 },
    );
  }

  let ready = true;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.ready === "boolean") {
      ready = body.ready;
    }
  } catch {
    // ignore, default ready=true
  }

  try {
    // Get current load
    const { data: load, error } = await supabaseAdmin
      .from("loads")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !load) {
      console.error("[ready-to-invoice] Load lookup error:", error);
      return NextResponse.json(
        { ok: false, error: "Load not found" },
        { status: 404 },
      );
    }

    const newStatus = ready ? "ready_to_invoice" : "docs_received";

    const { error: updateError } = await supabaseAdmin
      .from("loads")
      .update({ status: newStatus })
      .eq("id", id);

    if (updateError) {
      console.error("[ready-to-invoice] Status update error:", updateError);
      return NextResponse.json(
        { ok: false, error: "Failed to update status" },
        { status: 500 },
      );
    }

    // Only send billing email on ready=true
    if (ready && resend && load.shipper_email) {
      const laneDesc = buildLaneDescription(
        load.origin_city,
        load.origin_state,
        load.dest_city,
        load.dest_state,
      );
      const pickupPretty = load.pickup_date
        ? formatDateTime(load.pickup_date)
        : null;
      const deliveryPretty = load.delivery_date
        ? formatDateTime(load.delivery_date)
        : null;

      const subject = `Invoice ready for load ${
        load.reference || load.id
      } – Deadhead Zero`;

      const lines = [
        `Hello${load.shipper_name ? ` ${load.shipper_name}` : ""},`,
        "",
        `Your load has been marked ready to invoice.`,
        "",
        `Lane: ${laneDesc}`,
        pickupPretty ? `Pickup: ${pickupPretty}` : "",
        deliveryPretty ? `Delivery: ${deliveryPretty}` : "",
        load.rate ? `Rate: $${load.rate}` : "",
        "",
        "All carrier documents have been received and reviewed.",
        "You may issue payment according to our agreed terms.",
        "",
        "Thank you for working with Deadhead Zero Logistics LLC.",
      ].filter(Boolean);

      await resend.emails.send({
        from: "Deadhead Zero <info@deadheadzero.com>",
        to: [load.shipper_email],
        subject,
        text: lines.join("\n"),
      });
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (err) {
    console.error("[ready-to-invoice] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 },
    );
  }
}
