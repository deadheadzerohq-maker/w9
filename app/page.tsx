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
  const [smsConsent, setSmsConsent] = useState(false);
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
        "Enter your phone in full international format, e.g. +17172384576 (no spaces or dashes). "
      );
      return;
    }

    if (!smsConsent) {
      setError(
        "Please check the box to consent to receiving SMS messages from Deadhead Zero Reefer Whisper."
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
