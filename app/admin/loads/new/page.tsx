"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type CreateResponse = {
  ok: boolean;
  load?: {
    id: string;
    token: string;
  };
  error?: string;
};

export default function AdminNewLoadPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    reference: "",
    shipper_name: "",
    receiver_name: "",
    origin_city: "",
    origin_state: "",
    dest_city: "",
    dest_state: "",
    pickup_date: "",
    delivery_date: "",
    carrier_name: "",
    carrier_email: "",
    rate: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/loads/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = (await res.json()) as CreateResponse;
      if (!res.ok || !json.ok || !json.load) {
        throw new Error(json.error || "Failed to create load");
      }

      setSuccess(
        "Load created and carrier email queued. Redirecting to load documents…",
      );

      setTimeout(() => {
        router.push(`/admin/load-docs/${json.load!.token}`);
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to create load");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <button
          type="button"
          onClick={() => router.push("/admin/loads")}
          className="mb-2 text-xs text-slate-400 hover:text-emerald-300"
        >
          ← Back to All Loads
        </button>

        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create New Load
          </h1>
          <p className="text-xs text-slate-400">
            Enter lane, dates, and carrier contact. We&apos;ll create the load,
            generate a secure upload link, and email the carrier immediately.
          </p>
        </header>

        {error && (
          <div className="text-xs rounded-xl border border-rose-500/50 bg-rose-500/10 text-rose-100 px-3 py-2">
            {error}
          </div>
        )}

        {success && (
          <div className="text-xs rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-100 px-3 py-2">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-4 text-xs"
        >
          {/* Lane */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 text-[11px]">
                Origin city
              </label>
              <input
                type="text"
                value={form.origin_city}
                onChange={(e) => updateField("origin_city", e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 text-[11px]">
                Origin state (abbr)
              </label>
              <input
                type="text"
                value={form.origin_state}
                onChange={(e) => updateField("origin_state", e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 text-[11px]">
                Destination city
              </label>
              <input
                type="text"
                value={form.dest_city}
                onChange={(e) => updateField("dest_city", e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 text-[11px]">
                Destination state (abbr)
              </label>
              <input
                type="text"
                value={form.dest_state}
                onChange={(e) => updateField("dest_state", e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
              />
            </div>
          </div>

          {/* Dates & ref */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 text-[11px]">
                Pickup date
              </label>
              <input
                type="date"
                value={form.pickup_date}
                onChange={(e) => updateField("pickup_date", e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 text-[11px]">
                Delivery date
              </label>
              <input
                type="date"
                value={form.delivery_date}
                onChange={(e) => updateField("delivery_date", e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 text-[11px]">
                Ref #
              </label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => updateField("reference", e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
              />
            </div>
          </div>

          {/* Shipper / Receiver */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 text-[11px]">
                Shipper name
              </label>
              <input
                type="text"
                value={form.shipper_name}
                onChange={(e) => updateField("shipper_name", e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 text-[11px]">
                Receiver name
              </label>
              <input
                type="text"
                value={form.receiver_name}
                onChange={(e) => updateField("receiver_name", e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
              />
            </div>
          </div>

          {/* Carrier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 text-[11px]">
                Carrier name
              </label>
              <input
                type="text"
                value={form.carrier_name}
                onChange={(e) => updateField("carrier_name", e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 text-[11px]">
                Carrier email
              </label>
              <input
                type="email"
                value={form.carrier_email}
                onChange={(e) => updateField("carrier_email", e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
              />
            </div>
          </div>

          {/* Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 text-[11px]">
                Rate to carrier (USD)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.rate}
                onChange={(e) => updateField("rate", e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <p className="text-[11px] text-slate-500">
              On save, the carrier receives a secure link to upload BOL, POD,
              rate con, and other docs for this load.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs rounded-full bg-emerald-500 text-slate-950 font-semibold shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create load & email carrier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
