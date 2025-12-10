"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type PendingDoc = {
  id: string;
  doc_type: string;
  original_filename: string;
  file_path: string;
  status: string | null;
  created_at: string;
  grok_fraud_score?: number | null;
  grok_fraud_label?: string | null;
};

type ApprovedDoc = {
  id: string;
  pending_document_id?: string | null;
  token: string;
  doc_type: string;
  original_filename: string;
  file_path: string;
  created_at: string;
};

type LoadMeta = {
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
};

type LoadDocsResponse = {
  ok: boolean;
  token: string;
  load: LoadMeta | null;
  pending: PendingDoc[];
  approved: ApprovedDoc[];
};

export default function AdminLoadDocsPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [data, setData] = useState<LoadDocsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingPath, setOpeningPath] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/load-docs/${encodeURIComponent(token)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to load documents");
      }
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const openStorageFile = async (filePath: string) => {
    try {
      setOpeningPath(filePath);
      const res = await fetch("/api/admin/doc-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok || !json.url) {
        throw new Error(json.error || "Failed to generate signed URL");
      }

      const viewerUrl = `/admin/doc-viewer?url=${encodeURIComponent(
        json.url,
      )}&name=${encodeURIComponent(
        filePath.split("/").pop() || "Document",
      )}`;

      if (typeof window !== "undefined") {
        window.open(viewerUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to open document");
    } finally {
      setOpeningPath(null);
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  const formatShortDate = (value: string | null) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  };

  const loadLane = (load: LoadMeta | null) => {
    if (!load) return null;
    const oCity = load.origin_city || "Origin";
    const oState = load.origin_state || "";
    const dCity = load.dest_city || "Destination";
    const dState = load.dest_state || "";
    return `${oCity}${oState ? ", " + oState : ""} \u2192 ${dCity}${
      dState ? ", " + dState : ""
    }`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => router.push("/admin/docs")}
          className="mb-4 text-xs text-slate-400 hover:text-emerald-300"
        >
          ← Back to Document Review
        </button>

        {/* Load summary */}
        <header className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Load Documents
            </h1>
            <p className="text-sm text-slate-400">
              Token:{" "}
              <span className="font-mono text-slate-200 break-all">
                {token}
              </span>
            </p>
            {data?.load ? (
              <div className="mt-2 text-xs text-slate-300 space-y-1">
                <div className="font-medium">
                  {loadLane(data.load)}
                  {data.load.reference && (
                    <>
                      {" "}
                      • Ref:{" "}
                      <span className="font-mono">
                        {data.load.reference}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-slate-400">
                  Shipper:{" "}
                  {data.load.shipper_name || (
                    <span className="text-slate-500 italic">N/A</span>
                  )}
                  {" • "}
                  Receiver:{" "}
                  {data.load.receiver_name || (
                    <span className="text-slate-500 italic">N/A</span>
                  )}
                </div>
                <div className="text-slate-400">
                  Pickup:{" "}
                  {formatShortDate(data.load.pickup_date) || (
                    <span className="text-slate-500 italic">N/A</span>
                  )}
                  {" • "}
                  Delivery:{" "}
                  {formatShortDate(data.load.delivery_date) || (
                    <span className="text-slate-500 italic">N/A</span>
                  )}
                  {" • "}
                  Status:{" "}
                  <span className="font-mono">
                    {data.load.status || "N/A"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                No load metadata found for this token. We can later wire tokens
                directly at load creation so this view always has full context.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="px-3 py-1 text-xs rounded-full border border-slate-700 bg-slate-900 hover:border-emerald-400/60 hover:text-emerald-200"
          >
            Refresh
          </button>
        </header>

        {error && (
          <div className="mb-3 text-xs rounded-xl border border-rose-500/50 bg-rose-500/10 text-rose-100 px-3 py-2">
            {error}
          </div>
        )}

        {loading && (
          <p className="text-xs text-slate-400 mb-3">Loading documents…</p>
        )}

        {/* Approved docs section */}
        <section className="mb-6 bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-emerald-300 mb-2">
            Approved documents (load_documents)
          </h2>
          {data?.approved && data.approved.length > 0 ? (
            <div className="space-y-2 text-xs">
              {data.approved.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 border border-slate-800 rounded-xl px-3 py-2 bg-slate-950/40"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-100 truncate">
                      {doc.original_filename}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {doc.doc_type} •{" "}
                      {formatDate(doc.created_at) || "Unknown time"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void openStorageFile(doc.file_path)}
                    disabled={openingPath === doc.file_path}
                    className="px-3 py-1 text-[11px] rounded-full border border-slate-700 bg-slate-900 hover:border-emerald-400/60 hover:text-emerald-200 disabled:opacity-60"
                  >
                    {openingPath === doc.file_path ? "Opening…" : "View"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              No approved documents yet for this token.
            </p>
          )}
        </section>

        {/* Pending docs section */}
        <section className="mb-6 bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-amber-300 mb-2">
            Pending / rejected documents (pending_documents)
          </h2>
          {data?.pending && data.pending.length > 0 ? (
            <div className="space-y-2 text-xs">
              {data.pending.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 border border-slate-800 rounded-xl px-3 py-2 bg-slate-950/40"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-100 truncate">
                      {doc.original_filename}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {doc.doc_type} • status:{" "}
                      <span className="font-mono">
                        {doc.status || "pending"}
                      </span>{" "}
                      •{" "}
                      {formatDate(doc.created_at) || "Unknown time"}
                    </div>
                    {typeof doc.grok_fraud_score === "number" &&
                      doc.grok_fraud_label && (
                        <div className="text-[11px] text-slate-400 mt-1">
                          Fraud: {doc.grok_fraud_label} (
                          {Math.round(doc.grok_fraud_score)} / 100)
                        </div>
                      )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void openStorageFile(doc.file_path)}
                    disabled={openingPath === doc.file_path}
                    className="px-3 py-1 text-[11px] rounded-full border border-slate-700 bg-slate-900 hover:border-emerald-400/60 hover:text-emerald-200 disabled:opacity-60"
                  >
                    {openingPath === doc.file_path ? "Opening…" : "View"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              No pending or rejected documents for this token.
            </p>
          )}
        </section>

        <p className="text-[11px] text-slate-500">
          This view is keyed by the upload token. As we tighten the brokerage
          flow, each token can be generated at load creation and tied directly
          to that load&apos;s lifecycle.
        </p>
      </div>
    </div>
  );
}
