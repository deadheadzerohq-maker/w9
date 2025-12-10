// app/carrier/load-docs/[token]/page.tsx
"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";

type DocType = "BOL" | "POD" | "Rate Confirmation" | "Other";

const docTypeToValue = (docType: DocType) => {
  switch (docType) {
    case "BOL":
      return "BOL";
    case "POD":
      return "POD";
    case "Rate Confirmation":
      return "ratecon";
    case "Other":
      return "other";
    default:
      return "other";
  }
};

export default function CarrierUploadPage() {
  const params = useParams();
  const token = params?.token as string;

  const [activeDocType, setActiveDocType] = useState<DocType>("BOL");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    setFiles(Array.from(event.target.files));
    setError(null);
    setSuccess(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!event.dataTransfer.files?.length) return;
    setFiles(Array.from(event.dataTransfer.files));
    setError(null);
    setSuccess(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleUpload = async () => {
    if (!files.length) {
      setError("Please select at least one file to upload.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("docType", docTypeToValue(activeDocType));
      files.forEach((file) => formData.append("files", file));

      const res = await fetch(`/api/carrier/load-docs/${token}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        console.error("Upload failed:", data);
        setError(
          data?.error ||
            "Failed to upload documents. Please try again or contact support.",
        );
        return;
      }

      setSuccess("Documents uploaded successfully. Thank you!");
      setFiles([]);
    } catch (err) {
      console.error("Unexpected upload error:", err);
      setError(
        "Unexpected error while uploading documents. Please try again shortly.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl p-6 md:p-8 space-y-6"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Upload Load Documents
          </h1>
          <p className="text-sm text-slate-400">
            Securely upload your BOL, POD, rate confirmation, and other load
            paperwork for Deadhead Zero Logistics.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
          <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 font-mono text-[11px] md:text-xs text-slate-400 truncate max-w-full">
            Secure access link: {token}
          </span>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/40 px-3 py-1 text-[11px] md:text-xs text-emerald-300">
            Encrypted &amp; reviewed by ops
          </span>
        </div>

        {/* Doc type selector */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">
            Document type
          </span>
          <div className="inline-flex space-x-2 rounded-full bg-slate-900/80 p-1 border border-slate-800">
            {(["BOL", "POD", "Rate Confirmation", "Other"] as DocType[]).map(
              (type) => {
                const isActive = activeDocType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setActiveDocType(type);
                      setError(null);
                      setSuccess(null);
                    }}
                    className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm transition-all ${
                      isActive
                        ? "bg-emerald-500 text-slate-900 font-medium"
                        : "bg-transparent text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {type}
                  </button>
                );
              },
            )}
          </div>
        </div>

        {/* Upload area */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">
            Upload files
          </span>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700/80 rounded-xl bg-slate-900/60 px-4 py-10 cursor-pointer hover:border-emerald-500/60 transition-colors"
          >
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="file-input"
              accept=".pdf,.png,.jpg,.jpeg,.heic,.webp"
            />
            <label
              htmlFor="file-input"
              className="flex flex-col items-center gap-2 text-center"
            >
              <span className="text-sm font-medium text-slate-100">
                Drag &amp; drop files here
              </span>
              <span className="text-xs text-slate-400">
                or click to browse your device. PDF, PNG, JPG up to 10MB.
              </span>
            </label>

            {files.length > 0 && (
              <div className="mt-4 w-full max-w-sm text-left text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-slate-200">
                  Selected file{files.length > 1 ? "s" : ""}:
                </div>
                <ul className="max-h-32 overflow-y-auto space-y-1">
                  {files.map((file) => (
                    <li
                      key={file.name + file.size}
                      className="truncate text-slate-300/90"
                    >
                      {file.name}{" "}
                      <span className="text-slate-500">
                        ({Math.round(file.size / 1024)} KB)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Feedback + submit */}
        <div className="space-y-3">
          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              {success}
            </div>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="w-full inline-flex items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-semibold py-2.5 text-sm hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? "Uploading…" : "Upload documents"}
          </button>

          <p className="text-[11px] leading-snug text-slate-500">
            By uploading, you confirm these are accurate shipping documents for
            the assigned load. Documents are stored securely and reviewed by
            Deadhead Zero operations before invoicing.
          </p>
        </div>
      </motion.div>
    </main>
  );
}
