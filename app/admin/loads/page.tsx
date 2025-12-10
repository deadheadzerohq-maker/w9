// app/admin/loads/page.tsx
"use client";

import React, { useEffect, useState } from "react";

type LoadStatus =
  | "created"
  | "dispatched"
  | "in_transit"
  | "docs_received"
  | "ready_to_invoice"
  | "delivered"
  | "completed"
  | "archived";

type Load = {
  id: number;
  token: string;
  reference: string | null;
  status: LoadStatus;
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
  created_at: string;
  shipper_billed_amount: number | null;
  carrier_pay_amount: number | null;
  paid_status: string | null;
  paid_at: string | null;
  margin_cached: number | null;
};

const STATUS_OPTIONS: { value: "all" | LoadStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "created", label: "Created" },
  { value: "dispatched", label: "Dispatched" },
  { value: "in_transit", label: "In transit" },
  { value: "docs_received", label: "Docs received" },
  { value: "ready_to_invoice", label: "Ready to invoice" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

function formatDateTime(dt: string | null) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dt: string | null) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return "-";
  return `$${value.toFixed(2)}`;
}

function formatStatusBadge(status: LoadStatus) {
  const label = status.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function PaidBadge({ paidStatus }: { paidStatus: string | null }) {
  const status = paidStatus || "unpaid";
  let colorClasses = "bg-gray-800 text-gray-100 border border-gray-600";

  if (status === "paid") {
    colorClasses = "bg-emerald-900/60 text-emerald-200 border border-emerald-500/60";
  } else if (status === "partially_paid") {
    colorClasses = "bg-amber-900/60 text-amber-200 border border-amber-500/60";
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${colorClasses}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function AdminLoadsPage() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | LoadStatus>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [readyToggleLoadingId, setReadyToggleLoadingId] = useState<number | null>(null);
  const [markPaidLoadingId, setMarkPaidLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchLoads() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("status", statusFilter);
      if (search.trim().length > 0) {
        params.set("search", search.trim());
      }

      const res = await fetch(`/api/admin/loads/list?${params.toString()}`, {
        method: "GET",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch loads");
      }

      const data = await res.json();
      setLoads(data.loads || []);
    } catch (err: any) {
      console.error("Error fetching loads:", err);
      setError(err.message || "Failed to fetch loads");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLoads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLoads();
  };

  const handleRowClick = (token: string) => {
    if (!token) return;
    window.location.href = `/admin/load-docs/${token}`;
  };

  const handleReadyToggle = async (load: Load, ready: boolean) => {
    try {
      setReadyToggleLoadingId(load.id);
      setError(null);

      const res = await fetch(`/api/admin/loads/${load.id}/ready-to-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ready }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update ready_to_invoice status");
      }

      const data = await res.json();
      const newStatus = data.status as LoadStatus;

      setLoads((prev) =>
        prev.map((l) =>
          l.id === load.id
            ? {
                ...l,
                status: newStatus,
              }
            : l,
        ),
      );
    } catch (err: any) {
      console.error("Error toggling ready_to_invoice:", err);
      setError(err.message || "Failed to update status");
    } finally {
      setReadyToggleLoadingId(null);
    }
  };

  const handleMarkPaid = async (load: Load) => {
    try {
      setMarkPaidLoadingId(load.id);
      setError(null);

      const shipperDefault =
        load.shipper_billed_amount !== null && load.shipper_billed_amount !== undefined
          ? load.shipper_billed_amount.toString()
          : load.rate !== null && load.rate !== undefined
          ? load.rate.toString()
          : "";

      const carrierDefault =
        load.carrier_pay_amount !== null && load.carrier_pay_amount !== undefined
          ? load.carrier_pay_amount.toString()
          : "";

      const shipperInput = window.prompt(
        `Shipper billed amount for load ${load.reference || load.id}:`,
        shipperDefault,
      );
      if (shipperInput === null) {
        setMarkPaidLoadingId(null);
        return;
      }

      const carrierInput = window.prompt(
        `Carrier pay amount for load ${load.reference || load.id}:`,
        carrierDefault,
      );
      if (carrierInput === null) {
        setMarkPaidLoadingId(null);
        return;
      }

      const shipperValue = shipperInput.trim();
      const carrierValue = carrierInput.trim();

      if (!shipperValue || !carrierValue) {
        alert("Both shipper billed and carrier pay amounts are required.");
        setMarkPaidLoadingId(null);
        return;
      }

      const shipperNumber = Number(shipperValue);
      const carrierNumber = Number(carrierValue);

      if (!Number.isFinite(shipperNumber) || !Number.isFinite(carrierNumber)) {
        alert("Amounts must be valid numbers.");
        setMarkPaidLoadingId(null);
        return;
      }

      const res = await fetch(`/api/admin/loads/${load.id}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipperBilledAmount: shipperNumber,
          carrierPayAmount: carrierNumber,
          paidStatus: "paid",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to mark load as paid");
      }

      const data = await res.json();
      const updated = data.load as Load;

      setLoads((prev) => prev.map((l) => (l.id === load.id ? updated : l)));
    } catch (err: any) {
      console.error("Error marking load as paid:", err);
      setError(err.message || "Failed to mark load as paid");
    } finally {
      setMarkPaidLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Loads – Deadhead Zero
            </h1>
            <p className="text-sm text-gray-400">
              Track docs, invoice readiness, and paid / margin in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={() => (window.location.href = "/admin/loads/new")}
            className="inline-flex items-center justify-center rounded-lg border border-cyan-500/70 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/20"
          >
            + New load
          </button>
        </header>

        <section className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-950 to-gray-900/60 p-4 shadow-xl shadow-cyan-500/10">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs uppercase tracking-wide text-gray-400">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | LoadStatus)
                }
                className="rounded-lg border border-gray-700 bg-black/60 px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-1 items-center gap-2">
              <input
                type="text"
                placeholder="Search ref, shipper, carrier, origin, destination..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 rounded-lg border border-gray-700 bg-black/60 px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm hover:bg-gray-700"
              >
                Search
              </button>
            </div>
          </form>
        </section>

        {error && (
          <div className="rounded-xl border border-rose-700 bg-rose-950/60 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-gray-800 bg-black/60 shadow-xl shadow-cyan-500/5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-950/80 border-b border-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-400">
                    Created
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-400">
                    Ref
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-400">
                    Lane
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-400">
                    Carrier
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-400">
                    PU / Del
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-400">
                    Rate
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-400">
                    Margin
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-400">
                    Status
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-400">
                    Ready?
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-400">
                    Paid
                  </th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {loads.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-3 py-8 text-center text-gray-500"
                    >
                      {loading ? "Loading loads..." : "No loads found."}
                    </td>
                  </tr>
                )}

                {loads.map((load) => {
                  const lane = `${load.origin_city || ""}${
                    load.origin_state ? ", " + load.origin_state : ""
                  } → ${load.dest_city || ""}${
                    load.dest_state ? ", " + load.dest_state : ""
                  }`;

                  const margin =
                    load.margin_cached !== null &&
                    load.margin_cached !== undefined
                      ? load.margin_cached
                      : load.shipper_billed_amount !== null &&
                        load.shipper_billed_amount !== undefined &&
                        load.carrier_pay_amount !== null &&
                        load.carrier_pay_amount !== undefined
                      ? load.shipper_billed_amount - load.carrier_pay_amount
                      : null;

                  const isReady =
                    load.status === "ready_to_invoice" ||
                    load.status === "delivered" ||
                    load.status === "completed";

                  return (
                    <tr
                      key={load.id}
                      className="border-b border-gray-800/80 hover:bg-gray-900/60"
                    >
                      <td
                        className="px-3 py-2 align-top cursor-pointer"
                        onClick={() => handleRowClick(load.token)}
                      >
                        {formatDateTime(load.created_at)}
                      </td>
                      <td
                        className="px-3 py-2 align-top cursor-pointer whitespace-nowrap"
                        onClick={() => handleRowClick(load.token)}
                      >
                        {load.reference || `#${load.id}`}
                      </td>
                      <td
                        className="px-3 py-2 align-top cursor-pointer"
                        onClick={() => handleRowClick(load.token)}
                      >
                        <div className="max-w-[220px] truncate">{lane}</div>
                      </td>
                      <td
                        className="px-3 py-2 align-top cursor-pointer"
                        onClick={() => handleRowClick(load.token)}
                      >
                        <div className="max-w-[200px] truncate">
                          {load.carrier_name || "-"}
                        </div>
                      </td>
                      <td
                        className="px-3 py-2 align-top cursor-pointer whitespace-nowrap"
                        onClick={() => handleRowClick(load.token)}
                      >
                        <div>{formatDate(load.pickup_date)}</div>
                        <div className="text-xs text-gray-500">
                          → {formatDate(load.delivery_date)}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                        {formatCurrency(load.rate)}
                      </td>
                      <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                        {margin !== null ? formatCurrency(margin) : "-"}
                      </td>
                      <td className="px-3 py-2 align-top text-center">
                        <span className="inline-flex items-center rounded-full bg-gray-900/60 px-2 py-1 text-xs text-gray-200 border border-gray-700">
                          {formatStatusBadge(load.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-center">
                        <button
                          type="button"
                          disabled={readyToggleLoadingId === load.id}
                          onClick={() => handleReadyToggle(load, !isReady)}
                          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs border ${
                            isReady
                              ? "border-emerald-500/70 bg-emerald-900/50 text-emerald-100"
                              : "border-gray-600 bg-gray-900 text-gray-200"
                          } ${
                            readyToggleLoadingId === load.id
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:border-cyan-500/80"
                          }`}
                        >
                          {readyToggleLoadingId === load.id
                            ? "Saving..."
                            : isReady
                            ? "Ready"
                            : "Not ready"}
                        </button>
                      </td>
                      <td className="px-3 py-2 align-top text-center">
                        <PaidBadge paidStatus={load.paid_status} />
                      </td>
                      <td className="px-3 py-2 align-top text-center">
                        <button
                          type="button"
                          disabled={markPaidLoadingId === load.id}
                          onClick={() => handleMarkPaid(load)}
                          className="inline-flex items-center justify-center rounded-full border border-cyan-500/70 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {markPaidLoadingId === load.id
                            ? "Updating..."
                            : "Mark paid"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
