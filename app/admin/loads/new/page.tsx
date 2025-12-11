// app/admin/loads/new/page.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";

type CreateResponse = {
  ok: boolean;
  loadId?: string | number;
  token?: string;
  uploadUrl?: string;
  emailSent?: boolean;
  emailError?: string | null;
  error?: string;
};

export default function NewLoadPage() {
  // ... all the same state hooks you already have ...

  // (use exactly the version I sent you earlier with shipper email + everything)
  // The only part that matters for this bug is the success card:

  // Inside your JSX, replace the success card block with this:

  {/* success card */}
  {result?.ok && result.uploadUrl && (
    <div className="mb-4 text-xs rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-100 px-3 py-2 space-y-1">
      <div className="font-semibold">Load created successfully.</div>
      <div>
        Upload link for carrier:{" "}
        <a
          href={result.uploadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {result.uploadUrl}
        </a>
      </div>
      {result.token && (
        <div>
          Admin view for this token:{" "}
          <Link
            href={`/admin/load-docs/${encodeURIComponent(result.token)}`}
            className="underline"
          >
            open in Document Ops
          </Link>
        </div>
      )}
      {result.emailSent && (
        <div className="text-emerald-200">
          Upload email sent to carrier and optional shipper CC.
        </div>
      )}
      {result.emailSent === false && result.emailError && (
        <div className="text-amber-200">
          Load was created but email failed: {result.emailError}. You can copy
          the link above and send manually.
        </div>
      )}
    </div>
  )}
}
