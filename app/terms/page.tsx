import React from "react";

const content = `Deadhead Zero Reefer Whisper – Terms of Service
Effective November 26, 2025

1. Overview

Deadhead Zero Reefer Whisper ("Reefer Whisper") is a subscription SMS service operated by Deadhead Zero Logistics LLC ("Deadhead Zero", "we", "us"). Reefer Whisper delivers one (1) daily text message with market intelligence for the refrigerated (reefer) trucking industry.

Reefer Whisper is an optional, standalone SMS subscription product. Participation in the Reefer Whisper SMS program is not required to use any other Deadhead Zero Logistics LLC products or services.

Separately, Deadhead Zero Logistics LLC may operate an FMCSA-licensed freight brokerage under a separate authority (MC XXXXXXX). Any brokerage services are distinct from the Reefer Whisper SMS program and do not require enrollment in this SMS subscription.

2. Subscription & Billing

• Price: $99 per month, billed automatically via Stripe or another designated payment processor.  
• Recurring Billing: Your subscription will renew automatically each month until cancelled.  
• Cancellation: You may cancel any time through the Stripe Customer Portal or by contacting support at support@deadheadzero.com.  
• Refunds: We do not provide refunds or credits for partial months, unused time, or unused messages.

3. Nature of Content – No Guarantees

Reefer Whisper content is informational market commentary based on public data sources (including but not limited to USDA and FMCSA data), industry signals, and our own analysis. All content is provided "as is" and is not a guarantee of any particular outcome, rate, volume, or profitability.

Reefer Whisper is a technology-only insights service. It does not:

• Broker freight,  
• Negotiate rates,  
• Act as a load board,  
• Hold customer funds, or  
• Provide investment, legal, or financial advice.

You are solely responsible for your own business decisions, including but not limited to accepting loads, setting rates, and choosing lanes.

4. SMS Program & Consent

Reefer Whisper is delivered via text message (SMS). The core SMS program details are:

• Frequency: One (1) informational SMS message per day.  
• Message Content: Reefer lane insights, tightening markets, and related reefer freight intelligence.  
• Charges: Message and data rates may apply, depending on your mobile carrier plan.

SMS Consent is collected separately at the time of sign-up:

• You must actively check a dedicated SMS consent checkbox on our website to enroll in the Reefer Whisper SMS program.  
• The checkbox is unchecked by default and requires an affirmative action from you (express written consent).  
• Providing your mobile number alone does not enroll you into the SMS program. SMS enrollment is obtained only through the explicit, separate checkbox on the sign-up page.

Participation in the Reefer Whisper SMS program is optional and is not required as a condition of purchasing or using any other Deadhead Zero Logistics LLC products or services.

5. Opt-Out & Support (STOP/HELP)

You may revoke your consent and stop receiving Reefer Whisper SMS messages at any time by replying:

• "STOP" to cancel future messages, or  
• "HELP" for additional information or support.

You may also contact us at support@deadheadzero.com if you need assistance with your subscription, including cancellation.

6. Acceptable Use

You agree not to use the Reefer Whisper service for any unlawful purpose or in any way that violates applicable laws or regulations. You may not attempt to interfere with or disrupt our systems, misuse the service, or reverse engineer any part of the platform.

We may suspend or terminate your access to Reefer Whisper if we believe, in our sole discretion, that you have violated these Terms or applicable law.

7. Limitation of Liability

To the fullest extent permitted by law:

• Deadhead Zero Logistics LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, or data, arising out of or in connection with your use of Reefer Whisper.  
• Our total aggregate liability for all claims related to the service shall not exceed the total amounts you have paid to us for the Reefer Whisper subscription during the twelve (12) months immediately preceding the event giving rise to the claim.

8. Disclaimers

Reefer Whisper content is based on third-party data and sources believed to be reliable but is not guaranteed as to accuracy, completeness, or timeliness. Market conditions can change rapidly, and past or current commentary does not guarantee future conditions.

You understand and agree that you use the information provided at your own risk.

9. Governing Law & Venue

These Terms shall be governed by and construed in accordance with the laws of the State of Wyoming, without regard to its conflict of law principles. Any disputes arising out of or relating to these Terms or your use of Reefer Whisper shall be brought exclusively in the state or federal courts located in Sheridan County, Wyoming, and you consent to the personal jurisdiction of such courts.

10. Changes to These Terms

We may update these Terms from time to time. When we do, we will update the "Effective" date above. Your continued use of Reefer Whisper after any changes become effective constitutes your acceptance of the revised Terms.

11. Contact Information

For questions about these Terms or the Reefer Whisper service, please contact:

Deadhead Zero Logistics LLC  
Email: support@deadheadzero.com  

© 2025 Deadhead Zero Logistics LLC`;

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white px-4 py-10">
      <pre className="whitespace-pre-wrap text-sm max-w-3xl mx-auto">
        {content}
      </pre>
    </main>
  );
}
