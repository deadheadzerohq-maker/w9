"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type LoadRow = {
  id: string;
  token: string | null;
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
  rate: number | null;
  created_at: string | null;
};

type StatusFilter =
  | "all"
  | "created"
  | "dispatched"
  | "in_transit"
  | "delivered"
  | "completed";

export default function AdminLoadsPage() {
  const [loads, setLoads] = useState<LoadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const loadLoads = async (status: StatusFilter, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q) params.set("q", q);
      const qs = params.toString() ? `?${params.toString()}` : "";

      const res = await fetch(`/api/admin/loads/list${qs}`, {
        cache: "no-store",
      });
      const json = await res.json();

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
    void loadLoads(statusFilter, appliedSearch);
  }, [statusFilter, appliedSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(search.trim());
  };

  const formatDate = (value: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  };

  const laneFor = (load: LoadRow) => {
    const oCity = load.origin_city || "Origin";
    const oState = load.origin_state || "";
    const dCity = load.dest_city || "Destination";
    const dState = load.dest_state || "";
    return `${oCity}${oState ? ", " + oState : ""} → ${dCity}${
      dState ? ", " + dState : ""
    }`;
  };

  const statusBadge = (status: string | null) => {
    const s = status || "created";
    let cls =
      "border-slate-700 bg-slate-900 text-slate-200";

    if (s === "created") {
      cls = "border-amber-500/40 bg-amber-500/10 text-amber-200";
    } else if (s === "in_transit" || s === "dispatched") {
      cls = "border-sky-500/40 bg-sky-500/10 text-sky-200";
    } else if (s === "delivered") {
      cls = "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
    } else if (s === "completed") {
      cls = "border-emerald-500/60 bg-emerald-600/15 text-emerald-100";
    }

    return (
      <span
        className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border ${cls}`}
      >
        {s}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              All Loads
            </h1>
            <p className="text-sm text-slate-400">
              Search and filter all loads. Click into a load to view documents
              and operations.
            </p>
          </div>
          <Link
            href="/admin"
            className="text-xs text-slate-400 hover:text-emerald-300"
          >
            ← Back to Admin Portal
          </Link>
        </header>

        {/* Filters */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Status:</span>
            {(
              [
                "all",
                "created",
                "dispatched",
                "in_transit",
                "delivered",
                "completed",
              ] as StatusFilter[]
            ).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full border text-[11px] ${
                  statusFilter === s
                    ? "bg-emerald-500 text-slate-900 border-emerald-400"
                    : "bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-400/60"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 text-xs"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reference, carrier, email, origin, destination…"
              className="w-full md:w-72 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:border-emerald-400/60 hover:text-emerald-200"
            >
              Search
            </button>
          </form>
        </div>

        {/* Status line */}
        <div className="mb-3 text-xs text-slate-400 flex items-center justify-between">
          <span>
            {loading
              ? "Loading loads…"
              : `Showing ${loads.length} load(s)${
                  statusFilter !== "all" ? ` with status "${statusFilter}"` : ""
                }${
                  appliedSearch
                    ? ` matching "${appliedSearch}"`
                    : ""
                }`}
          </span>
          <button
            type="button"
            onClick={() => void loadLoads(statusFilter, appliedSearch)}
            className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900 hover:border-emerald-400/60 hover:text-emerald-200"
          >
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-x-auto text-xs">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left py-2 px-3 font-normal">Created</th>
                <th className="text-left py-2 px-3 font-normal">Reference</th>
                <th className="text-left py-2 px-3 font-normal">Lane</th>
                <th className="text-left py-2 px-3 font-normal">Dates</th>
                <th className="text-left py-2 px-3 font-normal">
                  Carrier
                </th>
                <th className="text-left py-2 px-3 font-normal">Rate</th>
                <th className="text-left py-2 px-3 font-normal">
                  Status
                </th>
                <th className="text-right py-2 px-3 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loads.map((load) => (
                <tr
                  key={load.id}
                  className="border-b border-slate-850 last:border-0"
                >
                  <td className="py-2 px-3 align-top text-slate-300 whitespace-nowrap">
                    {load.created_at
                      ? new Date(load.created_at).toLocaleString()
                      : ""}
                  </td>
                  <td className="py-2 px-3 align-top">
                    <div className="text-slate-100">
                      {load.reference || "—"}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate max-w-[150px]">
                      {load.id}
                    </div>
                  </td>
                  <td className="py-2 px-3 align-top">
                    <div className="text-slate-100 truncate max-w-[200px]">
                      {laneFor(load)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Pickup: {formatDate(load.pickup_date) || "N/A"}
                    </div>
                  </td>
                  <td className="py-2 px-3 align-top whitespace-nowrap">
                    <div className="text-[11px] text-slate-400">
                      Pickup: {formatDate(load.pickup_date) || "N/A"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Delivery: {formatDate(load.delivery_date) || "N/A"}
                    </div>
                  </td>
                  <td className="py-2 px-3 align-top">
                    <div className="text-slate-100 truncate max-w-[160px]">
                      {load.carrier_name || "—"}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                      {load.carrier_email || "—"}
                    </div>
                  </td>
                  <td className="py-2 px-3 align-top whitespace-nowrap text-slate-100">
                    {load.rate != null ? `$${load.rate.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-2 px-3 align-top whitespace-nowrap">
                    {statusBadge(load.status)}
                  </td>
                  <td className="py-2 px-3 align-top whitespace-nowrap text-right">
                    {load.token ? (
                      <Link
                        href={`/admin/load-docs/${encodeURIComponent(
                          load.token,
                        )}`}
                        className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900 hover:border-emerald-400/60 hover:text-emerald-200 text-[11px]"
                      >
                        Open
                      </Link>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        No token
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {!loading && loads.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-6 text-center text-slate-500 text-xs"
                  >
                    No loads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[11px] text-slate-500">
          Each load row links into the token-based document ops view. We can
          later add status transitions and invoicing flows directly from this
          screen.
        </p>
      </div>
    </div>
  );
}
