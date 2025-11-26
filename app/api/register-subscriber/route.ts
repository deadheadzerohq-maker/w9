// @ts-nocheck
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20"
});

export async function POST(request: Request) {
  const { email, phone, name } = await request.json();

  if (!email || !phone) {
    return NextResponse.json(
      { error: "Email and phone are required." },
      { status: 400 }
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1
      }
    ],
    metadata: {
      phone,
      name: name || ""
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}`
  });

  return NextResponse.json({ sessionId: session.id });
}
