"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type AdminDoc = {
  id: string;
  token: string;
  doc_type: string;
  original_filename: string;
  status: string | null;
  created_at: string;
  grok_fraud_score?: number | null;
  grok_fraud_label?: string | null;
};

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function AdminDocsPage() {
  const [docs, setDocs] = useState<AdminDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadDocs = async (status: StatusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const qs = status ? `?status=${status}` : "";
      const res = await fetch(`/api/admin/docs/list${qs}`, {
        cache: "no-store",
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to load documents");
      }
      setDocs(json.docs || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocs(statusFilter);
  }, [statusFilter]);

  const handleStatusChange = async (docId: string, nextStatus: "approved" | "rejected") => {
    setUpdatingId(docId);
    setError(null);
    try {
      const res = await fetch("/api/admin/docs/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, status: nextStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to update status");
      }

      // Update local state
      setDocs((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, status: nextStatus } : d,
        ),
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const badgeForFraud = (doc: AdminDoc) => {
    if (typeof doc.grok_fraud_score !== "number" || !doc.grok_fraud_label) {
      return (
        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-300 bg-slate-900/80">
          Not checked
        </span>
      );
    }

    const score = doc.grok_fraud_score;
    let cls =
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
    if (score >= 70) {
      cls = "border-rose-500/40 bg-rose-500/10 text-rose-200";
    } else if (score >= 40) {
      cls = "border-amber-500/40 bg-amber-500/10 text-amber-200";
    }

    return (
      <span
        className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border ${cls}`}
      >
        {doc.grok_fraud_label} ({Math.round(score)}/100)
      </span>
    );
  };

  const badgeForStatus = (status: string | null) => {
    const value = status || "pending";
    if (value === "approved") {
      return (
        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
          approved
        </span>
      );
    }
    if (value === "rejected") {
      return (
        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-200">
          rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-200">
        pending
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Document Review
            </h1>
            <p className="text-sm text-slate-400">
              Review BOL / POD / rate confirmations uploaded by carriers.
              Approve to promote into load_documents.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Filter:</span>
            {(["pending", "approved", "rejected", "all"] as StatusFilter[]).map(
              (s) => (
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
                  {s}
                </button>
              ),
            )}
          </div>
        </header>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          {error && (
            <div className="mb-3 text-xs rounded-xl border border-rose-500/50 bg-rose-500/10 text-rose-100 px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
            <span>
              {loading
                ? "Loading documents…"
                : `Showing ${docs.length} document(s)`}{" "}
              {statusFilter !== "all" && `with status "${statusFilter}"`}
            </span>
            <button
              type="button"
              onClick={() => void loadDocs(statusFilter)}
              className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900 hover:border-emerald-400/60 hover:text-emerald-200 transition"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left py-2 pr-3 font-normal">Uploaded</th>
                  <th className="text-left py-2 pr-3 font-normal">
                    Doc &amp; Token
                  </th>
                  <th className="text-left py-2 pr-3 font-normal">Fraud</th>
                  <th className="text-left py-2 pr-3 font-normal">Status</th>
                  <th className="text-right py-2 pl-3 font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-slate-850 last:border-0"
                  >
                    <td className="py-2 pr-3 align-top text-slate-300">
                      {new Date(doc.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <div className="text-slate-100 truncate">
                        {doc.original_filename}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {doc.doc_type} • token:{" "}
                        <span className="font-mono">{doc.token}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 align-top whitespace-nowrap">
                      {badgeForFraud(doc)}
                    </td>
                    <td className="py-2 pr-3 align-top whitespace-nowrap">
                      {badgeForStatus(doc.status)}
                    </td>
                    <td className="py-2 pl-3 align-top whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/load-docs/${encodeURIComponent(
                            doc.token,
                          )}`}
                          className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900 text-[11px] hover:border-emerald-400/60 hover:text-emerald-200"
                        >
                          Open
                        </Link>
                        <button
                          type="button"
                          disabled={updatingId === doc.id}
                          onClick={() =>
                            void handleStatusChange(doc.id, "approved")
                          }
                          className="px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 text-[11px] disabled:opacity-60"
                        >
                          {updatingId === doc.id && "Approving…"}
                          {updatingId !== doc.id && "Approve"}
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === doc.id}
                          onClick={() =>
                            void handleStatusChange(doc.id, "rejected")
                          }
                          className="px-3 py-1 rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-200 text-[11px] disabled:opacity-60"
                        >
                          {updatingId === doc.id && "Rejecting…"}
                          {updatingId !== doc.id && "Reject"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && docs.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-slate-500 text-xs"
                    >
                      No documents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-slate-500">
          This admin view uses a service-role Supabase client and bypasses RLS.
          Restrict access via middleware or Vercel Protection for{" "}
          <code className="font-mono">/admin</code> routes.
        </p>
      </div>
    </div>
  );
}
