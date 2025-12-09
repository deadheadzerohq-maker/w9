import React from "react";

const content = `Privacy Policy – Deadhead Zero Logistics LLC
Effective November 26, 2025

1. Overview

Deadhead Zero Logistics LLC ("Deadhead Zero", "we", "us") collects and processes limited personal information in order to provide our services, including the optional Deadhead Zero Reefer Whisper SMS subscription. This Privacy Policy explains what data we collect, how we use it, and your rights.

2. Information We Collect

We collect only the following information when you voluntarily provide it:

• Email address  
• Mobile phone number (optional; used only if you provide express written consent to enroll in the Reefer Whisper SMS program)  
• Name (optional)  
• Stripe customer ID and billing metadata (for subscription management)

We do not collect additional tracking data, behavioral data, or unnecessary personal information.

3. How We Use Your Information

We use the information you provide for the following purposes:

• To deliver the optional Reefer Whisper SMS subscription (only if you affirmatively opt in via a separate unchecked checkbox)  
• To send administrative or transactional emails related to your subscription  
• To manage billing, payments, and subscription status through Stripe  
• To respond to customer support inquiries

Providing your mobile number alone does **not** enroll you into SMS messaging. SMS messages are sent only when you explicitly check the SMS consent box at sign-up.

Your participation in the Reefer Whisper SMS program is **optional and not required** to use any other Deadhead Zero Logistics LLC services.

4. SMS Program & Consent

If you choose to enroll in the Reefer Whisper SMS program:

• You will receive one (1) daily informational SMS message.  
• Message and data rates may apply.  
• You may opt out at any time by replying "STOP."  
• You may obtain assistance by replying "HELP."  

SMS consent is collected separately from other agreements and is never a condition of purchasing or using any other Deadhead Zero Logistics LLC product or service.

5. How We Share Your Information

We do **not** sell or share your personal information with third parties for marketing purposes.

We only share limited data with:

• Stripe – for secure payment processing  
• Twilio or similar telecom providers – solely to deliver your SMS messages (if you opted in)  
• Supabase – for secure application and subscription management

All third-party processors are contractually restricted to using your information only as necessary to provide their services to us.

6. Data Retention & Deletion

If you cancel your subscription or opt out of the SMS program:

• SMS sending stops immediately  
• Billing access is revoked at the end of the billing cycle  
• Your data is deleted from our systems within 30 days, except where required by law or accounting standards

You may request deletion at any time by emailing support@deadheadzero.com.

7. Your Rights

You have the right to:

• Access the information we hold about you  
• Correct inaccuracies  
• Withdraw SMS consent (reply STOP)  
• Request deletion of your data  
• Ask questions about how your data is used

8. Children's Privacy

Deadhead Zero services are not intended for individuals under 18 years of age, and we do not knowingly collect data from minors.

9. Security

We use secure, industry-standard methods for transmitting and storing data, including encryption, secure APIs, and access controls. Payments are processed securely by Stripe; we do not store full payment details.

10. Updates to This Privacy Policy

We may update this Privacy Policy from time to time. When we do, the Effective Date at the top of this page will be updated. Continued use of our services constitutes acceptance of the updated policy.

11. Contact Information

For privacy questions, data requests, or policy inquiries, contact us at:

support@deadheadzero.com  
© 2025 Deadhead Zero Logistics LLC`;

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white px-4 py-10">
      <pre className="whitespace-pre-wrap text-sm max-w-3xl mx-auto">
        {content}
      </pre>
    </main>
  );
}
