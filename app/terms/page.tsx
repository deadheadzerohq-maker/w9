import React from "react";

const content = `Deadhead Zero Reefer Whisper – Terms of Service
Effective November 26, 2025

Deadhead Zero Logistics LLC ("we") sends one (1) daily SMS with market intelligence for the refrigerated trucking industry.

Subscription: $99 per month, billed automatically via Stripe. Cancel anytime in your Stripe Customer Portal – no refunds for partial months.

No Guarantees: Content is predictive commentary based on public USDA/FMCSA data. We are not a broker or load board.

SMS Consent: By providing your mobile number you agree to one daily text. Message & data rates may apply. Reply STOP to pause.

Limitation of Liability: Maximum liability limited to amounts paid in prior 12 months.

Governing Law: Texas · Venue Dallas County

support@deadheadzero.com
© 2025 Deadhead Zero Logistics LLC`;

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white px-4 py-10">
      <pre className="whitespace-pre-wrap text-sm max-w-3xl mx-auto">{content}</pre>
    </main>
  );
}
