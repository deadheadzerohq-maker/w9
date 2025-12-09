"use client";

// @ts-nocheck

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

type DocType = "BOL" | "POD" | "LUMPER" | "OTHER";

interface PendingDoc {
  id: string;
  file: File;
  docType: DocType;
}

// Helper so we don't import Node's crypto
const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export default function CarrierLoadDocsPage() {
  const params = useParams();
  const token = params?.token as string;

  // supabaseBrowserClient is already a SupabaseClient instance
  const supabase = supabaseBrowserClient;

  const [loadInfo, setLoadInfo] = useState<any | null>(null);
  const [documents, setDocuments] = useState<PendingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchLoad = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/carrier/load-docs/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load.");
        setLoadInfo(data.load);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Load not found.");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchLoad();
  }, [token]);

  const addFiles = (files: FileList | null, docType: DocType) => {
    if (!files) return;
    const next: PendingDoc[] = [];
    Array.from(files).forEach((f) =>
      next.push({ id: makeId(), file: f, docType })
    );
    setDocuments((prev) => [...prev, ...next]);
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (documents.length === 0) {
      setError("Please upload at least one document (POD/BOL).");
      return;
    }

    setSubmitting(true);

    try {
      const uploadedDocs: any[] = [];

      for (const doc of documents) {
        const ext = doc.file.name.split(".").pop() || "";
        const path = `load-${token}/${makeId()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("load-docs")
          .upload(path, doc.file, {
            cacheControl: "3600",
          });

        if (uploadError) {
          console.error(uploadError);
          throw new Error(
            `Failed to upload ${doc.file.name}. Please try again.`
          );
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("load-docs").getPublicUrl(path);

        uploadedDocs.push({
          docType: doc.docType,
          fileUrl: publicUrl,
          originalFilename: doc.file.name,
          mimeType: doc.file.type,
        });
      }

      const res = await fetch(`/api/carrier/load-docs/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: uploadedDocs }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit docs.");

      setSuccess("Docs uploaded. Thanks! This load will be marked delivered.");
      setDocuments([]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unexpected error uploading docs.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <p className="text-emerald-100">Loading load details…</p>
      </main>
    );
  }

  if (error || !loadInfo) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <p className="text-red-300 text-sm">{error || "Load not found."}</p>
      </main>
    );
  }

  return (
    <main className="flex justify-center min-h-[80vh] px-4 py-8">
      <div className="max-w-xl w-full bg-black/70 border border-emerald-400/40 rounded-3xl p-6 md:p-8">
        <h1 className="text-xl font-semibold text-white mb-2">
          Upload POD / BOL
        </h1>
        <p className="text-sm text-emerald-100/80 mb-4">
          Load {loadInfo.reference_number || loadInfo.id}:{" "}
          {loadInfo.origin_city}, {loadInfo.origin_state} →{" "}
          {loadInfo.dest_city}, {loadInfo.dest_state}
        </p>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-500/40 rounded-xl px-3 py-2 mb-3">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-emerald-300 bg-emerald-900/40 border border-emerald-500/40 rounded-xl px-3 py-2 mb-3">
            {success}
          </p>
        )}

        {/* Simple upload controls - you can style like your other panels */}
        <div className="space-y-3 mb-4 text-sm text-emerald-50">
          <div>
            <label className="block mb-1 font-medium">Proof of Delivery</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={(e) => addFiles(e.target.files, "POD")}
              className="text-xs text-emerald-100"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Bill of Lading</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={(e) => addFiles(e.target.files, "BOL")}
              className="text-xs text-emerald-100"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Lumper / Other</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={(e) => addFiles(e.target.files, "LUMPER")}
              className="text-xs text-emerald-100"
            />
          </div>
        </div>

        {documents.length > 0 && (
          <div className="mb-4 text-xs text-emerald-100/80">
            <p className="font-semibold mb-1">Files selected:</p>
            <ul className="space-y-1">
              {documents.map((d) => (
                <li key={d.id} className="flex justify-between gap-2">
                  <span className="truncate">{d.file.name}</span>
                  <span className="uppercase text-emerald-300">
                    {d.docType}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-full bg-emerald-400 text-black font-semibold py-3 text-sm hover:bg-emerald-300 transition disabled:opacity-60"
        >
          {submitting ? "Uploading…" : "Submit documents"}
        </button>
      </div>
    </main>
  );
}
