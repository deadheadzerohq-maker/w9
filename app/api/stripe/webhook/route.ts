// @ts-nocheck
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";        // Stripe needs Node runtime
export const dynamic = "force-dynamic"; // don't pre-render / pre-eval

let stripeClient: Stripe | null = null;
let supabaseClient: SupabaseClient | null = null;

function getStripe() {
  if (!stripeClient) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      // Only evaluated at request time, not build
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeClient = new Stripe(secret, { apiVersion: "2024-06-20" });
  }
  return stripeClient;
}

function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      // Only evaluated at request time, not build
      throw new Error("Supabase env vars not set");
    }

    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature") || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET env var");
    return new NextResponse("Webhook misconfigured", { status: 500 });
  }

  let event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook error:", err?.message || err);
    return new NextResponse(
      `Webhook Error: ${err?.message ?? "Invalid signature"}`,
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session: any = event.data.object;

    const email = session.customer_details?.email || session.customer_email;
    const customerId = session.customer as string;
    const phone = session.metadata?.phone || "";
    const name = session.metadata?.name || "";

    if (email && customerId) {
      const supabase = getSupabase();

      const { error } = await supabase.from("profiles").upsert(
        {
          email,
          phone,
          name,
          stripe_customer_id: customerId,
          paid_until: "2099-01-01" // evergreen paid_until
        },
        { onConflict: "email" }
      );

      if (error) {
        console.error("Supabase upsert error:", error);
      }
    }
  }

  return NextResponse.json({ received: true });
}
