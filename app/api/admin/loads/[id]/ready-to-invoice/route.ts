// app/api/admin/loads/[id]/ready-to-invoice/route.ts

import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import Stripe from "stripe";

export const runtime = "nodejs";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  // This will show in logs if env var is missing
  console.warn(
    "[ready-to-invoice] STRIPE_SECRET_KEY is not set. Invoice creation will fail.",
  );
}

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      // Use a recent API version; adjust if your project pins a different one
      apiVersion: "2024-06-20",
    })
  : null;

export async function POST(
  req: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const rawId = context.params.id;
    const loadId = Number(rawId);

    if (!loadId || Number.isNaN(loadId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid load id" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const ready =
      typeof body.ready === "boolean" ? body.ready : true; // default: true
    const paymentTerms = (body.paymentTerms as string | undefined) || "";

    // Fetch the load
    const { data: load, error: loadError } = await supabaseAdmin
      .from("loads")
      .select("*")
      .eq("id", loadId)
      .single();

    if (loadError || !load) {
      console.error("[ready-to-invoice] Load not found:", loadError);
      return NextResponse.json(
        { ok: false, error: "Load not found" },
        { status: 404 },
      );
    }

    // If ready is false, demote status and bail
    if (!ready) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("loads")
        .update({
          status: "docs_received",
          ready_to_invoice_at: null,
        })
        .eq("id", loadId)
        .select("*")
        .single();

      if (updateError) {
        console.error("[ready-to-invoice] Error demoting load:", updateError);
        return NextResponse.json(
          {
            ok: false,
            error:
              updateError.message || "Failed to set load back to docs_received",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          ok: true,
          status: updated.status,
          load: updated,
        },
        { status: 200 },
      );
    }

    // READY = true → create invoice via Stripe

    if (!stripe) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Stripe is not configured (missing STRIPE_SECRET_KEY). Cannot create invoice.",
        },
        { status: 500 },
      );
    }

    if (!load.shipper_email) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Cannot invoice: shipper_email is missing for this load. Please add it.",
        },
        { status: 400 },
      );
    }

    // Determine billed amount
    const billedAmount =
      load.shipper_billed_amount !== null &&
      load.shipper_billed_amount !== undefined
        ? Number(load.shipper_billed_amount)
        : load.rate !== null && load.rate !== undefined
          ? Number(load.rate)
          : null;

    if (billedAmount === null || Number.isNaN(billedAmount)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Cannot invoice: no shipper_billed_amount or rate set for this load.",
        },
        { status: 400 },
      );
    }

    // Payment terms text: custom per invoice, but with a default
    const termsText =
      paymentTerms.trim() ||
      (load.payment_terms_text as string | null) ||
      "Payment terms: Net 21 days from invoice date.";

    // Build a human-friendly description for the Stripe line item
    const lane =
      load.origin_city && load.dest_city
        ? `${load.origin_city}${load.origin_state ? `, ${load.origin_state}` : ""} → ${load.dest_city}${load.dest_state ? `, ${load.dest_state}` : ""}`
        : "Freight services";

    const pickupDate = load.pickup_date
      ? new Date(load.pickup_date).toLocaleDateString("en-US")
      : null;
    const deliveryDate = load.delivery_date
      ? new Date(load.delivery_date).toLocaleDateString("en-US")
      : null;

    const lineDescriptionParts = [
      "Reefer load",
      load.reference || `Load #${load.id}`,
      lane ? `(${lane})` : null,
      pickupDate ? `Pickup: ${pickupDate}` : null,
      deliveryDate ? `Delivery: ${deliveryDate}` : null,
    ].filter(Boolean);

    const lineDescription = lineDescriptionParts.join(" – ");

    // Create a Stripe customer for the shipper
    const customer = await stripe.customers.create({
      name: load.shipper_name || undefined,
      email: load.shipper_email || undefined,
      // If you eventually store shipper address, you can add it here
      metadata: {
        load_id: String(load.id),
        created_by: "Deadhead Zero Brokerage",
      },
    });

    // Create an invoice item
    const amountInCents = Math.round(billedAmount * 100);

    await stripe.invoiceItems.create({
      customer: customer.id,
      amount: amountInCents,
      currency: "usd",
      description: lineDescription,
      metadata: {
        load_id: String(load.id),
        token: load.token || "",
      },
    });

    // Create the invoice (Stripe will send it via email)
    // We'll default to Net 21 for due date; your custom terms text
    // is still shown in the invoice description / metadata.
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: "send_invoice",
      days_until_due: 21,
      auto_advance: true,
      metadata: {
        load_id: String(load.id),
        payment_terms_text: termsText,
      },
      description: [
        "Deadhead Zero Logistics LLC",
        "5532 N 192nd Lane",
        "Litchfield Park, Arizona 85340 US",
        "MC 1782185 · DOT 4504032",
        "",
        termsText,
      ].join("\n"),
    });

    // Finalize and send the invoice
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    const sent = await stripe.invoices.sendInvoice(finalized.id);

    const hostedUrl =
      sent.hosted_invoice_url ||
      finalized.hosted_invoice_url ||
      invoice.hosted_invoice_url ||
      null;

    const nowIso = new Date().toISOString();

    // Update the load with invoicing details
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("loads")
      .update({
        status: "ready_to_invoice",
        ready_to_invoice_at: nowIso,
        shipper_billed_amount: billedAmount,
        payment_terms_text: termsText,
        stripe_invoice_id: sent.id,
        stripe_invoice_url: hostedUrl,
        invoice_sent_at: nowIso,
      })
      .eq("id", loadId)
      .select("*")
      .single();

    if (updateError) {
      console.error(
        "[ready-to-invoice] Error updating load with invoice details:",
        updateError,
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            updateError.message || "Failed to update load with invoice info.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        status: updated.status,
        load: updated,
        stripeInvoiceId: sent.id,
        stripeInvoiceUrl: hostedUrl,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[ready-to-invoice] Unexpected error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected server error in ready-to-invoice.",
      },
      { status: 500 },
    );
  }
}
