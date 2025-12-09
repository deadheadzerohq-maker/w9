// app/api/brokerage/send-onboarding-invites/route.ts

import { NextResponse } from "next/server";

// Temporary stub route so the project builds without `resend`
// You can wire this up to actually send email later.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    // You can log or inspect the payload here if you want:
    console.log("Received onboarding invite payload:", body);

    // For now, just return OK with no email sending
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-onboarding-invites error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}
