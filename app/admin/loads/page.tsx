// app/admin/loads/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Load = {
  id: number;
  token: string | null;
  reference: string | null;
  status: string | null;
  shipper_name: string | null;
  shipper_email: string | null;
  receiver_name: string | null;
  origin_city: string | null;
  origin_state: string | null;
  dest_city: string | null;
  dest_state: string | null;
  pickup_date: string | null;
  delivery_date: string | null;
  carrier_name: string | null;
  carrier_email: string | null;
  rate: number | null;
  created_at: string | null;

  stripe_invoice_id: string | null;
  stripe_invoice_url: string | null;
  payment_terms_text: string | null;
  payment_due_days: number | null;
  shipper_billed_amount: number | null;
  paid_status: string | null;
  paid_at: string | null;
  margin_cached: number | null;
  invoice_sent_at: string | null;
  ready_to_invoice_at: string | null;
};

type ListResponse = {
  ok: boolean;
  loads: Load[];
  error?: string;
};

type ReadyToInvoiceResponse = {
  ok: boolean;
  status?: string;
  load?: Load;
  stripeInvoiceId?: string;
  stripeInvoiceUrl?: string;
  error?: string;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "created", label: "Created" },
  { value: "dispatched", label: "Dispatched" },
  { value: "in_transit", label: "In transit" },
  { value: "docs_received", label: "Docs received" },
  { value: "ready_to_invoice", label: "Ready to invoice" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
];

const PAID_STATUS_OPTIONS = [
  { value: "all", label: "All payment states" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
];

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${value.toFixed(2)}`;
}

export default function AdminLoadsPage() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paidStatusFilter, setPaidStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoad, setModalLoad] = useState<Load | null>(null);
  const [modalPaymentTerms, setModalPaymentTerms] = useState("");
  const [modalDueDays, setModalDueDays] = useState<string>("21");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  async function fetchLoads() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (paidStatusFilter && paidStatusFilter !== "all") {
        params.set("paid_status", paidStatusFilter);
      }
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await fetch(
        `/api/admin/loads/list${
          params.toString() ? `?${params.toString()}` : ""
        }`,
        {
          method: "GET",
        },
      );

      const json = (await res.json().catch(() => ({}))) as ListResponse;

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to load loads");
      }

      setLoads(json.loads || []);
    } catch (err: any) {
      console.error("Error loading loads:", err);
      setError(err.message || "Failed to load loads");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLoads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openInvoiceModal(load: Load) {
    const defaultTerms =
      load.payment_terms_text ||
      "Payment terms: Net 21 days. Late payments may be subject to finance charges as agreed.";
    const defaultDays =
      typeof load.payment_due_days === "number" &&
      !Number.isNaN(load.payment_due_days)
        ? String(load.payment_due_days)
        : "21";

    setModalLoad(load);
    setModalPaymentTerms(defaultTerms);
    setModalDueDays(defaultDays);
    setModalError(null);
    setModalOpen(true);
  }

  function closeInvoiceModal() {
    setModalOpen(false);
    setModalLoad(null);
    setModalPaymentTerms("");
    setModalDueDays("21");
    setModalError(null);
    setModalSubmitting(false);
  }

  async function handleSendInvoice() {
    if (!modalLoad) return;

    const dueDaysNumber = Number(modalDueDays);
    if (!modalPaymentTerms.trim()) {
      setModalError("Please enter payment terms.");
      return;
    }
    if (!Number.isFinite(dueDaysNumber) || dueDaysNumber <= 0) {
      setModalError("Please enter a valid positive number of days until due.");
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError(null);

      const res = await fetch(
        `/api/admin/loads/${modalLoad.id}/ready-to-invoice`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ready: true,
            paymentTerms: modalPaymentTerms,
            paymentDueDays: dueDaysNumber,
          }),
        },
      );

      const json = (await res.json().catch(() => ({}))) as ReadyToInvoiceResponse;

      if (!res.ok || !json.ok || !json.load) {
        throw new Error(json.error || "Failed to send invoice");
      }

      const updated = json.load;

      setLoads((prev) =>
        prev.map((l) => (l.id === updated.id ? (updated as Load) : l)),
      );

      closeInvoiceModal();
    } catch (err: any) {
      console.error("Error sending invoice:", err);
      setModalError(err.message || "Failed to send invoice");
      setModalSubmitting(false);
    }
  }

  async function handleUnsetReady(load: Load) {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/loads/${load.id}/ready-to-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ready: false,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as ReadyToInvoiceResponse;

      if (!res.ok || !json.ok || !json.load) {
        throw new Error(json.error || "Failed to unset ready-to-invoice");
      }

      const updated = json.load;
      setLoads((prev) =>
        prev.map((l) => (l.id === updated.id ? (updated as Load) : l)),
      );
    } catch (err: any) {
      console.error("Error unsetting ready-to-invoice:", err);
      setError(err.message || "Failed to unset ready-to-invoice");
    } finally {
      setLoading(false);
    }
  }

  const filteredLoads = loads; // API-side filtering

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Loads board
            </h1>
            <p className="text-sm text-slate-400">
              Track loads from creation through docs and invoicing. Stripe
              invoices are generated from ready-to-invoice loads.
            </p>
          </div>
          <Link
            href="/admin/loads/new"
            className="inline-flex items-center justify-center rounded-xl border border-emerald-400/70 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20"
          >
            + Create new load
          </Link>
        </header>

        {/* Filters */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400">
                  Load status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] focus:border-emerald-400 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400">
                  Payment status
                </label>
                <select
                  value={paidStatusFilter}
                  onChange={(e) => setPaidStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] focus:border-emerald-400 focus:outline-none"
                >
                  {PAID_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 min-w-[180px]">
                <label className="text-[11px] text-slate-400">
                  Search (ref / shipper / carrier / city)
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="e.g. Phoenix, ACME, REF123"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={fetchLoads}
              disabled={loading}
              className="self-start rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:border-emerald-400/70 hover:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
            {error}
          </div>
        )}

        {/* Loads table */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden text-xs">
          <div className="border-b border-slate-800 px-4 py-2 flex items-center justify-between text-slate-400">
            <span>Loads ({filteredLoads.length})</span>
            <span className="text-[10px]">
              Click lane to open document ops; use Invoice column to view
              Stripe.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900/80 text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left font-normal">Created</th>
                  <th className="px-3 py-2 text-left font-normal">Ref</th>
                  <th className="px-3 py-2 text-left font-normal">Lane</th>
                  <th className="px-3 py-2 text-left font-normal">Shipper</th>
                  <th className="px-3 py-2 text-left font-normal">Carrier</th>
                  <th className="px-3 py-2 text-right font-normal">Rate</th>
                  <th className="px-3 py-2 text-left font-normal">Status</th>
                  <th className="px-3 py-2 text-left font-normal">Invoice</th>
                  <th className="px-3 py-2 text-right font-normal">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLoads.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3 py-6 text-center text-slate-500"
                    >
                      No loads found. Create a new load to get started.
                    </td>
                  </tr>
                )}
                {filteredLoads.map((load) => {
                  const lane =
                    load.origin_city && load.dest_city
                      ? `${load.origin_city}${
                          load.origin_state ? `, ${load.origin_state}` : ""
                        } → ${load.dest_city}${
                          load.dest_state ? `, ${load.dest_state}` : ""
                        }`
                      : "—";
                  const canSendInvoice =
                    load.status === "docs_received" ||
                    load.status === "ready_to_invoice";

                  return (
                    <tr
                      key={load.id}
                      className="border-t border-slate-800 hover:bg-slate-900/60"
                    >
                      <td className="px-3 py-2 text-slate-300">
                        {formatDateTime(load.created_at)}
                      </td>
                      <td className="px-3 py-2 text-slate-200">
                        {load.reference || `#${load.id}`}
                      </td>
                      <td className="px-3 py-2">
                        {load.token ? (
                          <Link
                            href={`/admin/load-docs/${encodeURIComponent(
                              load.token,
                            )}`}
                            className="text-emerald-300 hover:underline"
                          >
                            {lane}
                          </Link>
                        ) : (
                          lane
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {load.shipper_name || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {load.carrier_name || "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatMoney(load.rate)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] capitalize">
                          {load.status || "unknown"}
                        </span>
                        {load.paid_status === "paid" && (
                          <span className="ml-1 inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-200">
                            Paid
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {load.stripe_invoice_url ? (
                          <a
                            href={load.stripe_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-300 hover:underline"
                          >
                            View invoice ↗
                          </a>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          {load.status === "ready_to_invoice" ? (
                            <button
                              type="button"
                              onClick={() => handleUnsetReady(load)}
                              disabled={loading}
                              className="rounded-lg border border-amber-400/60 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100 hover:bg-amber-500/20 disabled:opacity-60"
                            >
                              Unset ready
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openInvoiceModal(load)}
                              disabled={!canSendInvoice || loading}
                              className="rounded-lg border border-emerald-400/60 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-40"
                            >
                              Send invoice
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-2 text-[11px] text-slate-500">
          Invoicing flow: docs received →{" "}
          <span className="font-mono">Send invoice</span> → Stripe email +
          hosted invoice → mark paid when funds clear.
        </p>
      </div>

      {/* Payment terms modal */}
      {modalOpen && modalLoad && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-5 text-xs shadow-xl shadow-emerald-500/20">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Send invoice for{" "}
                  {modalLoad.reference || `Load #${modalLoad.id}`}
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  Adjust payment terms and due days for this specific shipper.
                  Stripe will email the invoice and host a payment page.
                </p>
              </div>
              <button
                type="button"
                onClick={closeInvoiceModal}
                className="text-slate-500 hover:text-slate-300 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400">
                  Payment terms (text shown on invoice)
                </label>
                <textarea
                  value={modalPaymentTerms}
                  onChange={(e) => setModalPaymentTerms(e.target.value)}
                  rows={3}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 focus:border-emerald-400 focus:outline-none"
                  placeholder="Payment terms: Net 21 days. Late payments may be subject to finance charges as agreed."
                />
              </div>
              <div className="flex flex-col gap-1 max-w-[120px]">
                <label className="text-[11px] text-slate-400">
                  Days until due
                </label>
                <input
                  type="number"
                  min={1}
                  value={modalDueDays}
                  onChange={(e) => setModalDueDays(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div className="text-[11px] text-slate-500">
                This invoice will be sent to{" "}
                <span className="font-mono text-slate-200">
                  {modalLoad.shipper_email || "no-shipper-email-set"}
                </span>
                . Make sure the shipper email is correct on the load before
                sending.
              </div>

              {modalError && (
                <div className="rounded-xl border border-rose-500/60 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
                  {modalError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeInvoiceModal}
                disabled={modalSubmitting}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendInvoice}
                disabled={modalSubmitting}
                className="rounded-lg border border-emerald-400/80 bg-emerald-500/20 px-3 py-1.5 text-[11px] font-medium text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
              >
                {modalSubmitting ? "Sending…" : "Send Stripe invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
