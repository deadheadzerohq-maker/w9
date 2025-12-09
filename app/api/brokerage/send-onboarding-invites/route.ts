import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = process.env.BROKERAGE_FROM_EMAIL!;
const ONBOARDING_URL = process.env.BROKERAGE_ONBOARDING_URL!;

export async function POST() {
  try {
    // 1. Find brokerage opt-ins who haven’t been invited yet
    const { data: subs, error } = await supabaseAdmin
      .from("subscribers")
      .select("*")
      .eq("brokerage_opt_in", true)
      .eq("has_onboarding_invite_sent", false)
      .limit(100);

    if (error) {
      console.error("Error fetching subs", error);
      return NextResponse.json({ error: "DB error." }, { status: 500 });
    }

    if (!subs || subs.length === 0) {
      return NextResponse.json({ ok: true, invited: 0 });
    }

    // 2. Send emails
    const results = await Promise.all(
      subs.map(async (s) => {
        try {
          await resend.emails.send({
            from: FROM,
            to: s.email,
            subject: "Complete your Deadhead Zero carrier packet",
            html: `
              <p>Hi ${s.name || "there"},</p>
              <p>Thanks for subscribing to Deadhead Zero Reefer Whisper and opting in to hear about freight opportunities.</p>
              <p>To be eligible for loads from Deadhead Zero Logistics LLC (FMCSA-licensed freight broker), please complete your carrier packet here:</p>
              <p><a href="${ONBOARDING_URL}" target="_blank" rel="noopener noreferrer">Complete your carrier onboarding</a></p>
              <p>This onboarding is separate from your SMS subscription and will be used for brokerage communication via email and phone.</p>
              <p>– Deadhead Zero Logistics LLC</p>
            `,
          });

          return { id: s.id, ok: true };
        } catch (err) {
          console.error("Resend email error", s.id, err);
          return { id: s.id, ok: false };
        }
      })
    );

    const successfulIds = results.filter((r) => r.ok).map((r) => r.id);

    if (successfulIds.length > 0) {
      await supabaseAdmin
        .from("subscribers")
        .update({ has_onboarding_invite_sent: true })
        .in("id", successfulIds);
    }

    return NextResponse.json({
      ok: true,
      invited: successfulIds.length,
      attempted: subs.length,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected error." },
      { status: 500 }
    );
  }
}
