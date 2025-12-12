"use client";

import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { motion } from "framer-motion";

const stripePromise = loadStripe(
  (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string) || ""
);

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [smsConsent, setSmsConsent] = useState(false);
  const [brokerageConsent, setBrokerageConsent] = useState(false);

  // Twilio-ready E.164 format: +[country][number], 10–15 digits total
  const phoneIsValid = (value: string) => {
    const e164 = /^\+[1-9]\d{9,14}$/;
    return e164.test(value.trim());
  };

  const handleSubscribe = async () => {
    setError(null);

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    if (!phoneIsValid(phone)) {
      setError(
        "Enter your phone in full international format, e.g. +17172384576 (no spaces or dashes)."
      );
      return;
    }

    if (!smsConsent) {
      setError(
        "Please check the box to give express written consent to receive daily SMS messages from Deadhead Zero Reefer Whisper."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/register-subscriber", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          phone: phone.trim(),
          name,
          smsOptInWhisper: smsConsent,
          brokerageOptIn: brokerageConsent,
        }),
      });

      if (!res.ok) throw new Error("Unable to start checkout.");

      const data = await res.json();
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to load.");

      await stripe.redirectToCheckout({ sessionId: data.sessionId });
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex justify-center min-h-[80vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl space-y-6 pt-20"
      >
        {/* HERO COPY */}
        <div className="w-full text-center space-y-3">
          <h1 className="text-4xl font-bold">Deadhead Zero Reefer Whisper</h1>
          <p className="text-lg opacity-80">
            One high-signal reefer lane text every morning at 6 AM Eastern.
          </p>
          <p className="text-xs opacity-60">
            Reefer Whisper is an optional standalone SMS subscription from
            Deadhead Zero Logistics LLC. Participation in this SMS program is{" "}
            <span className="font-semibold">
              not required to use any other Deadhead Zero Logistics LLC
              services
            </span>
            .
          </p>
        </div>

        {/* CARD + FORM */}
        <div className="bg-black border border-cyan-500/40 rounded-2xl p-6 shadow-lg shadow-cyan-500/30 space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full bg-black border border-cyan-500/50 rounded-2xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="space-y-1">
            <input
              type="tel"
              placeholder="+17172384576"
              inputMode="tel"
              className="w-full bg-black border border-cyan-500/50 rounded-2xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-[11px] opacity-60">
              Enter your number in full international format (E.164). Example:
              <span className="ml-1 font-mono">+17172384576</span>
            </p>
          </div>

          <input
            type="text"
            placeholder="(optional) Name"
            className="w-full bg-black border border-cyan-500/50 rounded-2xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <motion.button
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.97 }}
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-green-400 text-black font-semibold text-lg rounded-2xl py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Redirecting..." : "Subscribe – $99/month →"}
          </motion.button>

          {/* SMS CONSENT CHECKBOX – REEFER WHISPER ONLY (TWILIO) */}
          <div className="flex items-start gap-2 text-xs opacity-70 leading-relaxed">
            <input
              id="sms-consent"
              type="checkbox"
              checked={smsConsent}
              onChange={(e) => setSmsConsent(e.target.checked)}
              className="mt-[2px] h-4 w-4 rounded border-cyan-500/60 bg-black accent-green-400"
            />
            <label htmlFor="sms-consent" className="cursor-pointer">
              By checking this box, I give{" "}
              <span className="font-semibold">express written consent</span> to
              receive <span className="font-semibold">1 automated</span>{" "}
              informational SMS message per day from{" "}
              <span className="font-semibold">Deadhead Zero Reefer Whisper</span>{" "}
              at the phone number I provided, containing reefer market insights
              and lane opportunities. This SMS subscription is{" "}
              <span className="font-semibold">
                optional and not required to use any other Deadhead Zero
                Logistics LLC services
              </span>
              . Message and data rates may apply. Reply{" "}
              <span className="font-semibold">STOP</span> to cancel,{" "}
              <span className="font-semibold">HELP</span> for help.
            </label>
          </div>

          {/* BROKERAGE CONSENT CHECKBOX – EMAIL + CALLS ONLY */}
          <div className="flex items-start gap-2 text-xs opacity-70 leading-relaxed">
            <input
              id="brokerage-consent"
              type="checkbox"
              checked={brokerageConsent}
              onChange={(e) => setBrokerageConsent(e.target.checked)}
              className="mt-[2px] h-4 w-4 rounded border-cyan-500/60 bg-black accent-green-400"
            />
            <label htmlFor="brokerage-consent" className="cursor-pointer">
              I am interested in being contacted by Deadhead Zero Logistics LLC
              (FMCSA-licensed freight broker, MC XXXXXXX) about freight
              opportunities via email and voice calls. I understand brokerage
              communication is{" "}
              <span className="font-semibold">separate</span> from Reefer
              Whisper and will{" "}
              <span className="font-semibold">
                not use this SMS subscription
              </span>{" "}
              or this phone number for marketing texts.
            </label>
          </div>

          {/* ERROR MESSAGE */}
          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* EXAMPLE WHISPER */}
          <p className="text-xs opacity-60 italic pt-2">
            Example whisper: Salinas CA → Chicago IL: +12% to $2.85/mi. Slight
            truck shortages in leafy greens like spinach, kale, parsley
            tightening CA outbound reefer. Book spot loads now.
          </p>

          {/* CONTACT INFO */}
          <p className="text-xs opacity-60 pt-2 text-center">
            Contact us:{" "}
              <span className="underline">info@deadheadzero.com</span>
          </p>
        </div>

        {/* ABOUT SECTION */}
        <section className="text-xs sm:text-sm opacity-80 space-y-2 pt-2">
          <h2 className="text-sm font-semibold">
            About Deadhead Zero Logistics LLC
          </h2>
          <p>
            Deadhead Zero Logistics LLC is a U.S.-based company focused on
            refrigerated (reefer) freight and market intelligence for trucking
            professionals. We build tools that help carriers and freight brokers
            spot tightening markets, truck shortages, and strong lane
            opportunities.
          </p>
          <p>
            Reefer Whisper is our{" "}
            <span className="font-semibold">optional</span> subscription SMS
            intelligence product. It sends one concise daily text message with
            high-signal reefer market insights based on public data sources and
            industry signals. Reefer Whisper itself is a technology-only
            insights service and does not broker freight, negotiate rates, or
            hold customer funds.
          </p>
          <p>
            Separately, Deadhead Zero Logistics LLC also operates an
            FMCSA-licensed freight brokerage (MC 1782185) that communicates with
            carriers and shippers via email and phone calls, not SMS. Brokerage
            participation does not require subscribing to Reefer Whisper.
          </p>
        </section>
      </motion.div>
    </main>
  );
}
