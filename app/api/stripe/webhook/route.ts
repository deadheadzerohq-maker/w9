// app/api/stripe/webhook/route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import supabaseAdmin from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get("stripe-signature");

  if (!sig) {
    return new NextResponse("Missing Stripe signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err: any) {
    console.error("⚠️  Webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const subscriptionId = session.subscription as string | null;
        const customerId = session.customer as string | null;

        const email =
          session.customer_details?.email ||
          (session.metadata &&
            (session.metadata.email as string | undefined));

        const phone =
          (session.metadata &&
            (session.metadata.phone as string | undefined)) || undefined;

        const name =
          (session.metadata &&
            (session.metadata.name as string | undefined)) || undefined;

        // Push paid_until far into the future to match your “evergreen until cancel” logic
        const paidUntil = new Date();
        paidUntil.setFullYear(paidUntil.getFullYear() + 5); // 5 years out

        const { error } = await supabaseAdmin
          .from("subscribers")
          .upsert(
            {
              email,
              phone,
              name,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status: "active",
              paid_until: paidUntil.toISOString(),
            },
            { onConflict: "email" } // if email already exists, update it
          );

        if (error) {
          console.error(
            "Supabase upsert error (checkout.session.completed):",
            error
          );
          return new NextResponse("Supabase error", { status: 500 });
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { error } = await supabaseAdmin
          .from("subscribers")
          .update({
            status: "canceled",
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          console.error(
            "Supabase update error (subscription.deleted):",
            error
          );
        }

        break;
      }

      default:
        // For now we ignore all other event types
        break;
    }
  } catch (err) {
    console.error("Error handling Stripe webhook event:", err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }

  // Stripe only cares that we return a 2xx quickly
  return new NextResponse("OK", { status: 200 });
}
