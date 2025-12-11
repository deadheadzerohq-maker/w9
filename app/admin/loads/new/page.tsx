// app/admin/loads/new/page.tsx

"use client";

import React, { useState } from "react";
import Link from "next/link";

type CreateResponse = {
  ok: boolean;
  loadId?: string | number;
  token?: string;
  uploadUrl?: string;
  emailSent?: boolean;
  emailError?: string | null;
  error?: string;
};

export default function NewLoadPage() {
  const [reference, setReference] = useState("");
  const [shipperName, setShipperName] = useState("");
  const [shipperEmail, setShipperEmail] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [originState, setOriginState] = useState("");
  const [destCity, setDestCity] = useState("");
  const [destState, setDestState] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [carrierName, setCarrierName] = useState("");
  const [carrierEmail, setCarrierEmail] = useState("");
  const [rate, setRate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        reference: reference || null,
        shipperName: shipperName || null,
        shipperEmail: shipperEmail || null,
        receiverName: receiverName || null,
        originCity: originCity || null,
        originState: originState || null,
        destCity: destCity || null,
        destState: destState || null,
        pickupDate: pickupDate || null,
        deliveryDate: deliveryDate || null,
        carrierName: carrierName || null,
        carrierEmail: carrierEmail || null,
        rate: rate ? Number(rate) : null,
      };

      const res = await fetch("/api/admin/loads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json: CreateResponse = await res.json().catch(() => ({
        ok: false,
        error: "Failed to parse response",
      }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to create load");
      }

      setResult(json);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to create load");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Create New Load
            </h1>
            <p className="text-sm text-slate-400">
              Generate a load record, upload token, and auto-email the carrier
              an upload link for BOL / POD.
            </p>
          </div>
          <Link
            href="/admin"
            className="text-xs text-slate-400 hover:text-emerald-300"
          >
            ← Back to Admin Portal
          </Link>
        </header>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          {error && (
            <div className="mb-4 text-xs rounded-xl border border-rose-500/50 bg-rose-500/10 text-rose-100 px-3 py-2">
              {error}
            </div>
          )}

          {/* success card */}
          {result?.ok && result.uploadUrl && (
            <div className="mb-4 text-xs rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-100 px-3 py-2 space-y-1">
              <div className="font-semibold">Load created successfully.</div>
              <div>
                Upload link for carrier:{" "}
                <a
                  href={result.uploadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {result.uploadUrl}
                </a>
              </div>
              {result.token && (
                <div>
                  Admin view for this token:{" "}
                    <Link
                      href={`/admin/load-docs/${encodeURIComponent(
                        result.token,
                      )}`}
                      className="underline"
                    >
                      open in Document Ops
                    </Link>
                </div>
              )}
              {result.emailSent && (
                <div className="text-emerald-200">
                  Upload email sent to carrier and optional shipper CC.
                </div>
              )}
              {result.emailSent === false && result.emailError && (
                <div className="text-amber-200">
                  Load was created but email failed: {result.emailError}. You
                  can copy the link above and send manually.
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-sm">
            {/* Reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-slate-200">Reference (optional)</span>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  placeholder="Internal ref or load #"
                />
              </label>
            </div>

            {/* Shipper / Receiver */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-slate-200">Shipper name</span>
                <input
                  value={shipperName}
                  onChange={(e) => setShipperName(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  placeholder="Shipper company"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-slate-200">Shipper email</span>
                <input
                  type="email"
                  value={shipperEmail}
                  onChange={(e) => setShipperEmail(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  placeholder="billing@shipper.com"
                  required
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-slate-200">Receiver name</span>
                <input
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  placeholder="Receiver / consignee"
                />
              </label>
            </div>

            {/* Lane */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-slate-200">Origin city</span>
                <input
                  value={originCity}
                  onChange={(e) => setOriginCity(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  placeholder="Phoenix"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-slate-200">Origin state</span>
                <input
                  value={originState}
                  onChange={(e) => setOriginState(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  placeholder="AZ"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-slate-200">Destination city</span>
                <input
                  value={destCity}
                  onChange={(e) => setDestCity(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  placeholder="Chicago"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-slate-200">Destination state</span>
                <input
                  value={destState}
                  onChange={(e) => setDestState(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  placeholder="IL"
                />
              </label>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-slate-200">Pickup date/time</span>
                <input
                  type="datetime-local"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-slate-200">Delivery date/time</span>
                <input
                  type="datetime-local"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                />
              </label>
            </div>

            {/* Carrier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-slate-200">Carrier name</span>
                <input
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  placeholder="Carrier Company"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-slate-200">Carrier email</span>
                <input
                  type="email"
                  value={carrierEmail}
                  onChange={(e) => setCarrierEmail(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  placeholder="driver@carrier.com"
                  required
                />
              </label>
            </div>

            {/* Rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-slate-200">Rate (USD)</span>
                <input
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  placeholder="3450.00"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {submitting ? "Creating load…" : "Create load & email carrier"}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-4 text-[11px] text-slate-500">
          This form triggers token generation, creates a load record, and sends
          the carrier a secure upload link for documents. All uploads flow into
          your existing pending_documents → review → load_documents pipeline.
        </p>
      </div>
    </div>
  );
}
