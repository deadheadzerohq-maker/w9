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

type LoadDocsResponse = {
  ok: boolean;
  token: string;
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

  const openStorageFile = (filePath: string) => {
    // For now, just display the path; later you can add an API to generate a signed URL
    alert(
      `To view this file, either use Supabase Storage explorer or add an API to generate a signed URL.\n\nStorage path:\n${filePath}`,
    );
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

        <header className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Load Documents
            </h1>
            <p className="text-sm text-slate-400">
              Token:{" "}
              <span className="font-mono text-slate-200">{token}</span>
            </p>
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
                      {new Date(doc.created_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openStorageFile(doc.file_path)}
                    className="px-3 py-1 text-[11px] rounded-full border border-slate-700 bg-slate-900 hover:border-emerald-400/60 hover:text-emerald-200"
                  >
                    View
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
                      • {new Date(doc.created_at).toLocaleString()}
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
                    onClick={() => openStorageFile(doc.file_path)}
                    className="px-3 py-1 text-[11px] rounded-full border border-slate-700 bg-slate-900 hover:border-emerald-400/60 hover:text-emerald-200"
                  >
                    View
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
          This view is keyed by token. Later we can wire tokens directly to
          load IDs and show full load metadata here.
        </p>
      </div>
    </div>
  );
}
