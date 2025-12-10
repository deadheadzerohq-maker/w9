// app/admin/reports/margin/page.tsx
"use client";

import React, { useEffect, useState } from "react";

type Summary = {
  total_shipper_billed: number;
  total_carrier_pay: number;
  total_margin: number;
};

type MonthRow = {
  month: string;
  shipper_billed: number;
  carrier_pay: number;
  margin: number;
};

type ShipperRow = {
  shipper_name: string;
  shipper_billed: number;
  carrier_pay: number;
  margin: number;
};

type ApiResponse = {
  ok: boolean;
  from: string;
  to: string;
  summary: Summary;
  byMonth: MonthRow[];
  byShipper: ShipperRow[];
  count: number;
};

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function MarginReportPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [shipper, setShipper] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchReport() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (shipper.trim()) params.set("shipper", shipper.trim());

      const res = await fetch(
        `/api/admin/reports/margin?${params.toString()}`,
        {
          method: "GET",
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load margin report");
      }

      const json = (await res.json()) as ApiResponse;
      setData(json);
    } catch (err: any) {
      console.error("Error loading margin report:", err);
      setError(err.message || "Failed to load margin report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-black text-gray-100 px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Margin report
            </h1>
            <p className="text-sm text-gray-400">
              Shipper billed vs carrier pay vs margin for paid loads.
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-950 to-gray-900/60 p-4 shadow-xl shadow-cyan-500/10 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-wide text-gray-400">
                From (paid_at)
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-gray-700 bg-black/60 px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-wide text-gray-400">
                To (paid_at)
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-gray-700 bg-black/60 px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-wide text-gray-400">
                Shipper (exact match/ILike)
              </label>
              <input
                type="text"
                value={shipper}
                onChange={(e) => setShipper(e.target.value)}
                placeholder="Optional: ACME Produce"
                className="rounded-lg border border-gray-700 bg-black/60 px-3 py-1.5 text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={fetchReport}
                disabled={loading}
                className="w-full rounded-lg border border-cyan-500/70 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-700 bg-rose-950/60 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          {data && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-800 bg-black/70 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400">
                    Shipper billed
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {formatCurrency(data.summary.total_shipper_billed)}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-800 bg-black/70 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-400">
                    Carrier pay
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {formatCurrency(data.summary.total_carrier_pay)}
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-700 bg-emerald-950/40 p-4">
                  <div className="text-xs uppercase tracking-wide text-emerald-200">
                    Margin
                  </div>
                  <div className="mt-1 text-xl font-semibold text-emerald-200">
                    {formatCurrency(data.summary.total_margin)}
                  </div>
                  <div className="mt-1 text-xs text-emerald-200/80">
                    Loads: {data.count}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-800 bg-black/70">
                  <div className="border-b border-gray-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    By month (paid_at)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-gray-950/80 border-b border-gray-800">
                          <th className="px-3 py-2 text-left text-gray-400 font-medium">
                            Month
                          </th>
                          <th className="px-3 py-2 text-right text-gray-400 font-medium">
                            Shipper
                          </th>
                          <th className="px-3 py-2 text-right text-gray-400 font-medium">
                            Carrier
                          </th>
                          <th className="px-3 py-2 text-right text-gray-400 font-medium">
                            Margin
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.byMonth.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-4 text-center text-gray-500"
                            >
                              No paid loads in this range.
                            </td>
                          </tr>
                        )}
                        {data.byMonth.map((row) => (
                          <tr
                            key={row.month}
                            className="border-b border-gray-800/80"
                          >
                            <td className="px-3 py-2">{row.month}</td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(row.shipper_billed)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(row.carrier_pay)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(row.margin)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-800 bg-black/70">
                  <div className="border-b border-gray-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    By shipper
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-gray-950/80 border-b border-gray-800">
                          <th className="px-3 py-2 text-left text-gray-400 font-medium">
                            Shipper
                          </th>
                          <th className="px-3 py-2 text-right text-gray-400 font-medium">
                            Shipper
                          </th>
                          <th className="px-3 py-2 text-right text-gray-400 font-medium">
                            Carrier
                          </th>
                          <th className="px-3 py-2 text-right text-gray-400 font-medium">
                            Margin
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.byShipper.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-4 text-center text-gray-500"
                            >
                              No paid loads in this range.
                            </td>
                          </tr>
                        )}
                        {data.byShipper.map((row) => (
                          <tr
                            key={row.shipper_name}
                            className="border-b border-gray-800/80"
                          >
                            <td className="px-3 py-2">
                              {row.shipper_name || "Unknown"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(row.shipper_billed)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(row.carrier_pay)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(row.margin)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
