// @ts-nocheck
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20"
});

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature") || "";
  const body = await request.text();

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session: any = event.data.object;

    const email = session.customer_details?.email || session.customer_email;
    const customerId = session.customer;
    const phone = session.metadata?.phone || "";
    const name = session.metadata?.name || "";

    if (email && customerId) {
      const { error } = await supabase.from("profiles").upsert(
        {
          email,
          phone,
          name,
          stripe_customer_id: customerId,
          paid_until: "2099-01-01"
        },
        { onConflict: "email" }
      );

      if (error) {
        console.error("Supabase upsert error:", error);
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
