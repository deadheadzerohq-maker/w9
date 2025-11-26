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

    setLoading(true);
    try {
      const res = await fetch("/api/register-subscriber", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, phone: phone.trim(), name }),
      });

      if (!res.ok) {
        throw new Error("Unable to start checkout.");
      }

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
    <main className="flex items-center justify-center min-h-[80vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl space-y-6"
      >
        {/* HERO COPY */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold">Deadhead Zero Reefer Whisper</h1>
          <p className="text-lg opacity-80">
            One reefer text every morning.
            <br />
            The hidden lane edge before the herd wakes up.
          </p>
          <p className="text-sm opacity-70">
            Example Text: Reefer Alert: California northbound tightening fast Thu/Fri – lettuce and strawberry volume +18 % and carrier count down. – Deadhead Zero
          </p>
          <p className="text-sm opacity-70">$99 / month · Cancel anytime</p>
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

          <p className="text-xs opacity-70">
            You’ll be charged $99 today. First whisper tomorrow 6 AM Eastern.
          </p>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex gap-4 text-xs opacity-60">
          <a href="/terms" className="underline underline-offset-4">
            Terms of Service
          </a>
          <a href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </a>
        </div>
      </motion.div>
    </main>
  );
}
