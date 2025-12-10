"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LoadRow = {
  id: number; // ✅ numeric id
  token: string;
  reference: string | null;
  status: string | null;
  shipper_name: string | null;
  receiver_name: string | null;
  origin_city: string | null;
  origin_state: string | null;
  dest_city: string | null;
  dest_state: string | null;
  pickup_date: string | null;
  delivery_date: string | null;
  carrier_name: string | null;
  carrier_email: string | null;
  rate: string | null;
  created_at: string;
};

type LoadsResponse = {
  ok: boolean;
  loads: LoadRow[];
  error?: string;
};

export default function AdminLoadsPage() {
  const router = useRouter();

  const [loads, setLoads] = useState<LoadRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null); // ✅ number | null

  const fetchLoads = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/loads/list?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as LoadsResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to load loads");
      }
      setLoads(json.loads || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load loads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLoads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatShortDate = (value: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  };

  const laneText = (load: LoadRow) => {
    const oCity = load.origin_city || "Origin";
    const oState = load.origin_state || "";
    const dCity = load.dest_city || "Destination";
    const dState = load.dest_state || "";
    return `${oCity}${oState ? ", " + oState : ""} → ${dCity}${
      dState ? ", " + dState : ""
    }`;
  };

  const statusBadgeClasses = (status: string | null) => {
    const v = (status || "created").toLowerCase();
    if (v === "delivered" || v === "completed") {
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/40";
    }
    if (v === "in_transit" || v === "dispatched") {
      return "bg-sky-500/10 text-sky-300 border-sky-500/40";
    }
    if (v === "docs_received") {
      return "bg-amber-500/10 text-amber-300 border-amber-500/40";
    }
    if (v === "ready_to_invoice") {
      return "bg-purple-500/10 text-purple-300 border-purple-500/40";
    }
    return "bg-slate-800 text-slate-200 border-slate-600/60";
  };

  const isReadyToInvoice = (status: string | null) =>
    (status || "").toLowerCase() === "ready_to_invoice";

  const handleToggleReady = async (
    e: React.MouseEvent,
    load: LoadRow,
  ) => {
    e.stopPropagation(); // don't trigger row navigation

    const currentlyReady = isReadyToInvoice(load.status);
    const targetReady = !currentlyReady;

    try {
      setTogglingId(load.id);
      setError(null);

      const res = await fetch(
        `/api/admin/loads/${load.id}/ready-to-invoice`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ready: targetReady }),
        },
      );

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      setLoads((prev) =>
        prev.map((l) =>
          l.id === load.id ? { ...l, status: data.status } : l,
        ),
      );
    } catch (err: any) {
      console.error("handleToggleReady error:", err);
      setError(err.message || "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              All Loads
            </h1>
            <p className="text-xs text-slate-400">
              Internal view of every brokerage load in Deadhead Zero.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/admin/loads/new")}
            className="px-4 py-2 text-xs rounded-full bg-emerald-500 text-slate-950 font-semibold shadow-lg shadow-emerald-500/30 hover:bg-emerald-400"
          >
            + Create New Load
          </button>
        </header>

        {/* Filters */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs">
            <label className="text-slate-400" htmlFor="status-filter">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-full px-3 py-1 text-xs text-slate-100"
            >
              <option value="all">All</option>
              <option value="created">Created</option>
              <option value="dispatched">Dispatched</option>
              <option value="in_transit">In transit</option>
              <option value="docs_received">Docs received</option>
              <option value="ready_to_invoice">Ready to invoice</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ref, shipper, carrier, lane…"
            className="bg-slate-950 border border-slate-700 rounded-full px-3 py-1 text-xs text-slate-100 min-w-[200px]"
            />
            <button
              type="button"
              onClick={() => void fetchLoads()}
              className="px-3 py-1 text-xs rounded-full border border-slate-700 bg-slate-900 hover:border-emerald-400/60 hover:text-emerald-200"
            >
              Apply
            </button>
          </div>
        </section>

        {error && (
          <div className="text-xs rounded-xl border border-rose-500/50 bg-rose-500/10 text-rose-100 px-3 py-2">
            {error}
          </div>
        )}

        {/* Loads table */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900/90 border-b border-slate-800">
                <tr className="text-slate-400">
                  <th className="px-3 py-2 text-left">Created</th>
                  <th className="px-3 py-2 text-left">Ref</th>
                  <th className="px-3 py-2 text-left">Lane</th>
                  <th className="px-3 py-2 text-left">Carrier</th>
                  <th className="px-3 py-2 text-left">Pickup / Delivery</th>
                  <th className="px-3 py-2 text-left">Rate</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Ready to invoice</th>
                </tr>
              </thead>
              <tbody>
                {loads.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-4 text-center text-slate-500"
                    >
                      No loads found with the current filters.
                    </td>
                  </tr>
                )}
                {loads.map((load) => (
                  <tr
                    key={load.id}
                    className="border-b border-slate-800/80 hover:bg-slate-900 cursor-pointer"
                    onClick={() =>
                      router.push(`/admin/load-docs/${load.token}`)
                    }
                  >
                    <td className="px-3 py-2 text-slate-300">
                      {formatShortDate(load.created_at)}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-200">
                      {load.reference || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-200">
                      {laneText(load)}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {load.carrier_name || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {formatShortDate(load.pickup_date) || "—"} /{" "}
                      {formatShortDate(load.delivery_date) || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-200">
                      {load.rate ? `$${load.rate}` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] ${statusBadgeClasses(
                          load.status,
                        )}`}
                      >
                        {load.status || "created"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={(e) => handleToggleReady(e, load)}
                        disabled={togglingId === load.id}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                          isReadyToInvoice(load.status)
                            ? "bg-sky-500"
                            : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            isReadyToInvoice(load.status)
                              ? "translate-x-4"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-3 text-center text-slate-400"
                    >
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
