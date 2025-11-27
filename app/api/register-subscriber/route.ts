// app/api/register-subscriber/route.ts
// @ts-nocheck

import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

export async function POST(request: Request) {
  const { email, phone, name } = await request.json();

  // Basic validation
  if (!email || !phone) {
    return NextResponse.json(
      { error: "Email and phone are required." },
      { status: 400 }
    );
  }

  try {
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!priceId || !siteUrl) {
      console.error("Missing NEXT_PUBLIC_STRIPE_PRICE_ID or NEXT_PUBLIC_SITE_URL");
      return NextResponse.json(
        { error: "Server misconfigured. Please try again later." },
        { status: 500 }
      );
    }

    // Create Stripe Checkout Session for the $99/month subscription
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      // Pre-fill email on Checkout
      customer_email: email,

      // Redirect URLs
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}?canceled=1`,

      // Store subscriber info so the webhook can write to Supabase
      metadata: {
        email,
        phone,
        name: name || "",
      },
      subscription_data: {
        metadata: {
          email,
          phone,
          name: name || "",
        },
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("Stripe checkout session error:", error);
    return NextResponse.json(
      { error: "Unable to start checkout." },
      { status: 500 }
    );
  }
}
