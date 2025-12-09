"use client";

// @ts-nocheck

import React, { useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

type DocType = "COI" | "W9" | "AUTHORITY" | "OTHER";

interface PendingDoc {
  id: string;
  file: File;
  docType: DocType;
}

// Simple helper so we don't need Node's crypto import
const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export default function CarrierOnboardingPage() {
  // supabaseBrowserClient is already a client instance
  const supabase = supabaseBrowserClient;

  const [legalName, setLegalName] = useState("");
  const [dbaName, setDbaName] = useState("");
  const [mcNumber, setMcNumber] = useState("");
  const [dotNumber, setDotNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [remitAddress, setRemitAddress] = useState("");

  const [taxId, setTaxId] = useState("");
  const [primaryContactName, setPrimaryContactName] = useState("");
  const [primaryContactTitle, setPrimaryContactTitle] = useState("");
  const [dispatchPhone, setDispatchPhone] = useState("");
  const [afterHoursPhone, setAfterHoursPhone] = useState("");

  const [equipmentType, setEquipmentType] = useState("");
  const [preferredLanes, setPreferredLanes] = useState("");
  const [fleetSize, setFleetSize] = useState<number | "">("");

  const [operatingRegions, setOperatingRegions] = useState("48-state");

  const [agreementChecked, setAgreementChecked] = useState(false);
  const [esignName, setEsignName] = useState("");

  const [documents, setDocuments] = useState<PendingDoc[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const addFiles = (files: FileList | null, docType: DocType) => {
    if (!files) return;
    const next: PendingDoc[] = [];
    Array.from(files).forEach((f) => {
      next.push({
        id: makeId(),
        file: f,
        docType,
      });
    });
    setDocuments((prev) => [...prev, ...next]);
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!legalName || !email || !phone || !mcNumber || !dotNumber) {
      setError("Please complete all required fields (legal name, MC, DOT, contact).");
      return;
    }

    if (!agreementChecked || !esignName.trim()) {
      setError(
        "You must agree to the broker–carrier agreement and provide an e-signature name."
      );
      return;
    }

    setSubmitting(true);

    try {
      // 1) Upload docs to Supabase Storage
      const uploadedDocs: any[] = [];

      for (const doc of documents) {
        const ext = doc.file.name.split(".").pop() || "";
        const path = `${makeId()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("carrier-docs")
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
        } = supabase.storage.from("carrier-docs").getPublicUrl(path);

        uploadedDocs.push({
          docType: doc.docType,
          fileUrl: publicUrl,
          originalFilename: doc.file.name,
          mimeType: doc.file.type,
        });
      }

      // 2) Send payload to API
      const res = await fetch("/api/carrier/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName,
          dbaName,
          mcNumber,
          dotNumber,
          email,
          phone,

          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          remitAddress,
          taxId,
          primaryContactName,
          primaryContactTitle,
          dispatchPhone,
          afterHoursPhone,

          equipmentType,
          preferredLanes,
          fleetSize: fleetSize === "" ? null : Number(fleetSize),

          // No factoring fields; payment is fixed
          paymentTerms: "72 hours",
          operatingRegions,

          agreementChecked,
          esignName,

          documents: uploadedDocs,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit carrier packet.");
      }

      await res.json();

      setSuccess(
        "Thanks! Your carrier packet was submitted. We’ll review and follow up soon."
      );
      setDocuments([]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unexpected error submitting packet.");
    } finally {
      setSubmitting(false);
    }
  };

  const requiredLabel = (label: string) => (
    <span>
      {label} <span className="text-red-400">*</span>
    </span>
  );

  return (
    <main className="flex justify-center min-h-[80vh] px-4 py-10 bg-black text-white">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">
            Deadhead Zero Carrier Onboarding
          </h1>
          <p className="text-sm text-gray-300 max-w-2xl">
            Complete this packet so Deadhead Zero Logistics LLC (FMCSA-licensed
            freight broker) can tender loads to your fleet. This onboarding is
            separate from the Reefer Whisper SMS subscription.
          </p>
        </header>

        {/* Card */}
        <div className="bg-zinc-950 border border-cyan-500/40 rounded-2xl p-6 md:p-8 shadow-lg shadow-cyan-500/20 space-y-8">
          {/* Company Info */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Carrier & Authority Info</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs block mb-1">
                  {requiredLabel("Legal company name")}
                </label>
                <input
                  type="text"
                  className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs block mb-1">DBA (if any)</label>
                <input
                  type="text"
                  className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  value={dbaName}
                  onChange={(e) => setDbaName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs block mb-1">
                  {requiredLabel("MC number")}
                </label>
                <input
                  type="text"
                  className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  value={mcNumber}
                  onChange={(e) => setMcNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs block mb-1">
                  {requiredLabel("DOT number")}
                </label>
                <input
                  type="text"
                  className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  value={dotNumber}
                  onChange={(e) => setDotNumber(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Contact & Address */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Contact & Address</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs block mb-1">
                  {requiredLabel("Primary contact name")}
                </label>
                <input
                  type="text"
                  className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  value={primaryContactName}
                  onChange={(e) => setPrimaryContactName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Contact title</label>
                <input
                  type="text"
                  className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  value={primaryContactTitle}
                  onChange={(e) => setPrimaryContactTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs block mb-1">
                  {requiredLabel("Email")}
                </label>
                <input
                  type="email"
                  className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs block mb-1">
                  {requiredLabel("Phone")}
                </label>
                <input
                  type="tel"
                  className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Dispatch phone</label>
                <input
                  type="tel"
                  className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  value={dispatchPhone}
                  onChange={(e) => setDispatchPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs block mb-1">After-hours phone</label>
                <input
                  type="tel"
                  className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  value={afterHoursPhone}
                  onChange={(e) => setAfterHoursPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs block mb-1">Physical address</label>
                <input
                  type="text"
                  placeholder="Address line 1"
                  className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300 mb-2"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Address line 2"
                  className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300 mb-2"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    className="col-span-1 bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="State"
                    className="col-span-1 bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="ZIP"
                    className="col-span-1 bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs block mb-1">
                  Remit-to address (if different)
                </label>
                <textarea
                  className="w-full h-[120px] bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300 resize-none"
                  value={remitAddress}
                  onChange={(e) => setRemitAddress(e.target.value)}
                  placeholder="Remit name / address for payments"
                />
              </div>
            </div>
          </section>

          {/* Operations */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Operations & Equipment</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs block mb-1">Equipment type</label>
                <input
                  type="text"
                  placeholder="e.g. 53' reefer, team, hazmat"
                  className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  value={equipmentType}
                  onChange={(e) => setEquipmentType(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Fleet size</label>
                <input
                  type="number"
                  min={1}
                  className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  value={fleetSize}
                  onChange={(e) =>
                    setFleetSize(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Preferred lanes</label>
                <textarea
                  className="w-full h-[80px] bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300 resize-none"
                  value={preferredLanes}
                  onChange={(e) => setPreferredLanes(e.target.value)}
                  placeholder="e.g. CA → TX, AZ → Midwest, FL → Northeast"
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Operating regions</label>
                <input
                  type="text"
                  className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  value={operatingRegions}
                  onChange={(e) => setOperatingRegions(e.target.value)}
                  placeholder="48-state, regional, dedicated corridors, etc."
                />
              </div>
            </div>
          </section>

          {/* Tax & Payment */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Tax & Payment</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs block mb-1">Tax ID / EIN</label>
                <input
                  type="text"
                  className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                />
              </div>
              <div className="text-xs text-gray-300 flex items-center">
                Deadhead Zero pays carriers within{" "}
                <span className="ml-1 font-semibold text-green-300">
                  72 hours
                </span>{" "}
                of receiving a clean POD and invoice. No factoring required.
              </div>
            </div>
          </section>

          {/* Documents */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Upload required documents</h2>
            <p className="text-xs text-gray-300">
              At minimum, please upload your COI and W-9. Authority letters,
              safety certificates, and other documents can help us approve you
              faster.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              {/* COI */}
              <div className="border border-cyan-500/40 rounded-xl p-3 bg-black/40">
                <p className="text-xs font-semibold mb-2">Certificate of Insurance (COI)</p>
                <label className="inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-full border border-cyan-500/60 bg-cyan-500/10 cursor-pointer hover:bg-cyan-500/20 transition">
                  Upload COI
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files, "COI")}
                  />
                </label>
              </div>

              {/* W9 */}
              <div className="border border-cyan-500/40 rounded-xl p-3 bg-black/40">
                <p className="text-xs font-semibold mb-2">W-9</p>
                <label className="inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-full border border-cyan-500/60 bg-cyan-500/10 cursor-pointer hover:bg-cyan-500/20 transition">
                  Upload W-9
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files, "W9")}
                  />
                </label>
              </div>

              {/* Authority / Other */}
              <div className="border border-cyan-500/40 rounded-xl p-3 bg-black/40">
                <p className="text-xs font-semibold mb-2">Authority / Other docs</p>
                <label className="inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-full border border-cyan-500/60 bg-cyan-500/10 cursor-pointer hover:bg-cyan-500/20 transition">
                  Upload files
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files, "OTHER")}
                  />
                </label>
              </div>
            </div>

            {/* Selected files list */}
            {documents.length > 0 && (
              <div className="mt-3 border border-cyan-500/20 rounded-xl p-3 bg-black/40">
                <p className="text-xs font-semibold mb-2">Files selected</p>
                <ul className="space-y-1 max-h-40 overflow-auto text-xs">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{doc.file.name}</span>
                      <span className="px-2 py-0.5 rounded-full border border-cyan-500/40 text-[10px] uppercase">
                        {doc.docType}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Agreement */}
          <section className="space-y-3 border-t border-cyan-500/20 pt-4">
            <h2 className="text-lg font-semibold">Broker–Carrier Agreement</h2>
            <p className="text-xs text-gray-300">
              By submitting this packet, you confirm that the information
              provided is accurate and that you agree to Deadhead Zero
              Logistics LLC&apos;s broker–carrier terms, including safety,
              insurance, and payment policies as provided during onboarding.
            </p>
            <div className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                className="mt-[2px] h-4 w-4 rounded border-cyan-500/60 bg-black accent-green-400"
                checked={agreementChecked}
                onChange={(e) => setAgreementChecked(e.target.checked)}
              />
              <span>
                I have read and agree to the broker–carrier agreement and certify
                that I am authorized to sign on behalf of the carrier.
              </span>
            </div>
            <div className="max-w-xs">
              <label className="text-xs block mb-1">E-signature (full name)</label>
              <input
                type="text"
                className="w-full bg-black border border-cyan-500/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-300"
                value={esignName}
                onChange={(e) => setEsignName(e.target.value)}
                placeholder="Type your full legal name"
              />
            </div>
          </section>

          {/* Messages + Submit */}
          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-green-400 bg-green-400/10 border border-green-400/30 rounded-xl px-3 py-2">
              {success}
            </p>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2.5 rounded-2xl bg-green-400 text-black text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-110 transition"
            >
              {submitting ? "Submitting..." : "Submit carrier packet"}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 max-w-2xl">
          Deadhead Zero Logistics LLC is an FMCSA-licensed freight broker. By
          submitting this form you authorize Deadhead Zero to contact you about
          freight opportunities via email and phone, separate from any Reefer
          Whisper SMS subscription.
        </p>
      </div>
    </main>
  );
}
