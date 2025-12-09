"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

type UploadingDoc = {
  file: File;
  docType: string;
};

export default function CarrierOnboardingPage() {
  const [legalName, setLegalName] = useState("");
  const [dbaName, setDbaName] = useState("");
  const [mcNumber, setMcNumber] = useState("");
  const [dotNumber, setDotNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [preferredLanes, setPreferredLanes] = useState("");

  const [docs, setDocs] = useState<UploadingDoc[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addDocs = (files: FileList | null, docType: string) => {
    if (!files) return;
    const list: UploadingDoc[] = [];
    Array.from(files).forEach((file) => {
      list.push({ file, docType });
    });
    setDocs((prev) => [...prev, ...list]);
  };

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    if (!legalName || !email || !phone) {
      setError("Legal name, email, and phone are required.");
      return;
    }

    if (docs.length === 0) {
      setError("Please upload at least one document (COI, W9, etc.).");
      return;
    }

    setSubmitting(true);

    try {
      const uploadResults: {
        docType: string;
        fileUrl: string;
        originalFilename: string;
        mimeType: string;
      }[] = [];

      // 1) Upload each file to Supabase Storage
      for (const d of docs) {
        const file = d.file;
        const ext = file.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext || "bin"}`;

        const { data, error: uploadError } =
          await supabaseBrowserClient.storage
            .from("carrier-docs")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
            });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error("Failed to upload one or more documents.");
        }

        const { data: publicUrlData } = supabaseBrowserClient.storage
          .from("carrier-docs")
          .getPublicUrl(data.path); // or switch to signed URLs if you want them private

        uploadResults.push({
          docType: d.docType,
          fileUrl: publicUrlData.publicUrl,
          originalFilename: file.name,
          mimeType: file.type,
        });
      }

      // 2) Call our API to create carrier + run Grok analysis
      const res = await fetch("/api/carrier/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          legalName,
          dbaName,
          mcNumber,
          dotNumber,
          email,
          phone,
          equipmentType,
          preferredLanes,
          documents: uploadResults,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Onboarding failed.");
      }

      setMessage(
        "Thanks! Your carrier packet was submitted successfully. We’ll review your information and get back to you."
      );
      setDocs([]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex justify-center min-h-[80vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-6 pt-16 pb-10"
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">
            Carrier Onboarding – Deadhead Zero Logistics LLC
          </h1>
          <p className="text-sm opacity-80">
            Complete this secure onboarding form to be eligible for freight
            opportunities. We use automated fraud checks (via Grok) plus
            manual review to protect both carriers and shippers.
          </p>
        </div>

        <div className="bg-black border border-cyan-500/40 rounded-2xl p-6 shadow-lg shadow-cyan-500/30 space-y-4">
          {/* Identity */}
          <div className="space-y-2">
            <label className="text-xs opacity-80">
              Legal Name (as on authority / W9)
            </label>
            <input
              className="w-full bg-black border border-cyan-500/50 rounded-2xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs opacity-80">DBA (optional)</label>
            <input
              className="w-full bg-black border border-cyan-500/50 rounded-2xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
              value={dbaName}
              onChange={(e) => setDbaName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs opacity-80">MC Number</label>
              <input
                className="w-full bg-black border border-cyan-500/50 rounded-2xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                value={mcNumber}
                onChange={(e) => setMcNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs opacity-80">DOT Number</label>
              <input
                className="w-full bg-black border border-cyan-500/50 rounded-2xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                value={dotNumber}
                onChange={(e) => setDotNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs opacity-80">Email</label>
              <input
                type="email"
                className="w-full bg-black border border-cyan-500/50 rounded-2xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs opacity-80">Phone</label>
              <input
                className="w-full bg-black border border-cyan-500/50 rounded-2xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Ops Profile */}
          <div className="space-y-2">
            <label className="text-xs opacity-80">Equipment Type</label>
            <input
              className="w-full bg-black border border-cyan-500/50 rounded-2xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
              placeholder="Reefer, Dry Van, Flatbed, etc."
              value={equipmentType}
              onChange={(e) => setEquipmentType(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs opacity-80">
              Preferred Lanes / Regions
            </label>
            <textarea
              className="w-full bg-black border border-cyan-500/50 rounded-2xl px-3 py-2 text-sm outline-none focus:border-cyan-300 min-h-[60px]"
              placeholder="e.g., CA → Midwest, AZ → TX, Nogales → Southeast"
              value={preferredLanes}
              onChange={(e) => setPreferredLanes(e.target.value)}
            />
          </div>

          {/* Docs */}
          <div className="space-y-3">
            <p className="text-xs opacity-80">
              Upload your documents. PDFs preferred.
            </p>

            <div className="space-y-2">
              <label className="text-xs opacity-80">
                Certificate of Insurance (COI)
              </label>
              <input
                type="file"
                accept="application/pdf,image/*"
                multiple
                onChange={(e) => addDocs(e.target.files, "COI")}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs opacity-80">W9</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                multiple
                onChange={(e) => addDocs(e.target.files, "W9")}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs opacity-80">Authority / Other</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                multiple
                onChange={(e) => addDocs(e.target.files, "OTHER")}
                className="text-xs"
              />
            </div>

            {docs.length > 0 && (
              <div className="border border-cyan-500/30 rounded-2xl p-3 text-xs opacity-80 space-y-1">
                <p className="font-semibold mb-1">Files selected:</p>
                {docs.map((d, idx) => (
                  <div key={idx} className="flex justify-between gap-2">
                    <span className="truncate max-w-[70%]">
                      {d.file.name} ({d.docType})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          {error && <p className="text-xs text-red-400">{error}</p>}
          {message && <p className="text-xs text-green-400">{message}</p>}

          {/* Submit */}
          <motion.button
            whileHover={{ scale: submitting ? 1 : 1.02 }}
            whileTap={{ scale: submitting ? 1 : 0.97 }}
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full bg-green-400 text-black font-semibold text-lg rounded-2xl py-2.5 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {submitting ? "Submitting..." : "Submit Carrier Packet"}
          </motion.button>

          <p className="text-[11px] opacity-60 pt-2">
            By submitting, you consent to fraud screening and compliance checks.
            We may cross-reference your information with FMCSA and other public
            data sources to protect shippers and carriers.
          </p>
        </div>
      </motion.div>
    </main>
  );
}
