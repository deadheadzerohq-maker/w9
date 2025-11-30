import React from "react";

const content = `Privacy Policy – Deadhead Zero Logistics LLC

We collect only:  
• Email address  
• Mobile phone number (to send the daily whisper)  
• Stripe customer ID (for billing)

We use this solely to deliver the daily text and manage your subscription. We never sell or share your data.

Payments processed securely by Stripe. SMS sent via Twilio.

Cancel anytime in the Stripe Customer Portal – all data deleted within 30 days.

Questions → info@deadheadzero.com`;

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white px-4 py-10">
      <pre className="whitespace-pre-wrap text-sm max-w-3xl mx-auto">{content}</pre>
    </main>
  );
}
