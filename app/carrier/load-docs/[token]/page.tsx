"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import supabase from "@/lib/supabaseBrowserClient";

type DocType = "BOL" | "POD" | "Rate Confirmation" | "Other";

type PendingDocument = {
  id: string;
  doc_type: DocType | string;
  original_filename: string;
  file_path: string;
  status: string | null;
  created_at: string;
  grok_fraud_score?: number | null;
  grok_fraud_label?: string | null;
};

const docTypeOptions: DocType[] = ["BOL", "POD", "Rate Confirmation", "Other"];

export default function LoadDocsUploadPage() {
  const params = useParams();
  const token = params?.token as string;

  const [docType, setDocType] = useState<DocType>("BOL");
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingDocs, setExistingDocs] = useState<PendingDocument[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Fetch existing docs for this token (best-effort; may be blocked by RLS)
  useEffect(() => {
    if (!token) return;

    const fetchDocs = async () => {
      const { data, error } = await supabase
        .from("pending_documents")
        .select(
          "id, doc_type, original_filename, file_path, status, created_at, grok_fraud_score, grok_fraud_label",
        )
        .eq("token", token)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Unable to fetch existing docs (likely RLS):", error);
        return;
      }

      if (data) {
        setExistingDocs(data as PendingDocument[]);
      }
    };

    void fetchDocs();
  }, [token]);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    setFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(e.dataTransfer.files);
      if (inputRef.current) {
        inputRef.current.files = e.dataTransfer.files;
      }
    }
  };

  const preventDefault = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Missing token. Please use the secure link provided.");
      return;
    }

    if (!files || files.length === 0) {
      setError("Please select at least one file to upload.");
      return;
    }

    setUploading(true);
    try {
      const newDocs: PendingDocument[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.includes(".")
          ? file.name.split(".").pop()
          : undefined;
        const path = `${token}/${Date.now()}-${i}-${crypto.randomUUID()}.${
          ext || "pdf"
        }`;

        // 1) Upload to Supabase Storage (load-documents bucket)
        const { error: storageError } = await supabase.storage
          .from("load-documents")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (storageError) {
          console.error("Storage upload error:", storageError);
          throw new Error(
            `Failed to upload ${file.name}. Please try again or contact support.`,
          );
        }

        // 2) Insert metadata row into pending_documents
        const { data, error: insertError } = await supabase
          .from("pending_documents")
          .insert({
            token,
            doc_type: docType,
            file_path: path,
            original_filename: file.name,
            status: "pending",
          })
          .select(
            "id, doc_type, original_filename, file_path, status, created_at, grok_fraud_score, grok_fraud_label",
          )
          .single();

        if (insertError || !data) {
          console.error("Metadata insert error:", insertError);
          throw new Error(
            `Uploaded file, but failed to record metadata for ${file.name}.`,
          );
        }

        const inserted = data as PendingDocument;
        newDocs.push(inserted);

        // 3) Fire-and-forget email notification to you
        fetch("/api/notify-doc-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            docType,
            fileName: file.name,
            filePath: path,
          }),
        }).catch((err) => {
          console.error("Email notify error (non-fatal):", err);
        });

        // 4) Fire-and-forget Grok fraud check for this document
        fetch("/api/load-docs/fraud-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            docId: inserted.id,
          }),
        }).catch((err) => {
          console.error("Fraud check enqueue error (non-fatal):", err);
        });
      }

      setExistingDocs((prev) => [...newDocs, ...prev]);
      setFiles(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setSuccess("Documents uploaded successfully. Thank you!");
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "Something went wrong while uploading. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Upload Load Documents
          </h1>
          <p className="text-sm text-slate-400">
            Securely upload your BOL, POD, and other load documents for Deadhead
            Zero Logistics.
          </p>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl shadow-xl p-6 space-y-6">
          {/* Token notice */}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2">
            <span className="truncate">
              Secure access link:&nbsp;
              <span className="font-mono text-slate-300 truncate">
                {token || "Missing token"}
              </span>
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-300 px-2 py-0.5 text-[10px] font-medium border border-emerald-500/30">
              Encrypted &amp; reviewed by ops
            </span>
          </div>

          {/* Doc type selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">
              Document type
            </label>
            <div className="flex flex-wrap gap-2">
              {docTypeOptions.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDocType(type)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    docType === type
                      ? "bg-emerald-500 text-slate-900 border-emerald-400 shadow-lg shadow-emerald-500/30"
                      : "bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-400/60 hover:text-emerald-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Dropzone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">
              Upload files
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={preventDefault}
              onDragEnter={preventDefault}
              onDragLeave={preventDefault}
              className="border border-dashed border-slate-700 rounded-2xl bg-slate-900/60 px-6 py-8 text-center cursor-pointer hover:border-emerald-400/70 hover:bg-slate-900 transition"
              onClick={() => inputRef.current?.click()}
            >
              <p className="text-sm text-slate-200 font-medium mb-1">
                Drag &amp; drop files here
              </p>
              <p className="text-xs text-slate-400 mb-3">
                or click to browse your device. PDF, PNG, JPG up to 10MB.
              </p>
              <span className="inline-flex items-center text-xs px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
                Selected:{" "}
                <span className="ml-1 font-mono">
                  {files?.length ? `${files.length} file(s)` : "none"}
                </span>
              </span>
              <input
                ref={inputRef}
                type="file"
                multiple
                onChange={handleFilesChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Alerts */}
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

          {/* Upload button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {uploading ? "Uploading..." : "Upload documents"}
            </button>
          </div>
        </div>

        {/* Existing docs list */}
        {existingDocs.length > 0 && (
          <div className="mt-6 bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">
              Documents already uploaded
            </h2>
            <div className="space-y-2 max-h-64 overflow-auto text-xs">
              {existingDocs.map((doc) => (
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
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        doc.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
                          : doc.status === "rejected"
                          ? "bg-rose-500/10 text-rose-300 border-rose-500/40"
                          : "bg-amber-500/10 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {doc.status || "pending"}
                    </span>
                    {typeof doc.grok_fraud_score === "number" &&
                      doc.grok_fraud_label && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 bg-slate-900/80 text-slate-300">
                          Fraud: {doc.grok_fraud_label} (
                          {Math.round(doc.grok_fraud_score)} / 100)
                        </span>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer note */}
        <p className="mt-4 text-[11px] text-slate-500 text-center">
          All documents are transmitted over secure TLS and reviewed manually by
          Deadhead Zero ops. Fraud screening is powered by Grok.
        </p>
      </div>
    </div>
  );
}
