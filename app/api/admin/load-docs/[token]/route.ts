// app/api/admin/load-docs/[token]/route.ts

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } },
) {
  const token = params.token;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing token" },
      { status: 400 },
    );
  }

  try {
    // --- Load metadata (optional, so errors are non-fatal) ---
    const { data: load, error: loadError } = await supabaseAdmin
      .from("loads")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (loadError) {
      console.error("Error fetching load for token", token, loadError);
    }

    // --- Pending / rejected docs: pending_documents EXCLUDING approved ---
    const { data: pending, error: pendingError } = await supabaseAdmin
      .from("pending_documents")
      .select(
        `
          id,
          token,
          doc_type,
          original_filename,
          file_path,
          storage_path,
          storage_bucket,
          status,
          created_at,
          grok_fraud_score,
          grok_fraud_label
        `,
      )
      .eq("token", token)
      .neq("status", "approved")
      .order("created_at", { ascending: false });

    if (pendingError) {
      console.error(
        "Error fetching pending_documents for token",
        token,
        pendingError,
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            "Failed to fetch pending documents: " +
            (pendingError.message || pendingError.details || ""),
        },
        { status: 500 },
      );
    }

    // --- Approved docs: load_documents ---
    const { data: approvedRaw, error: approvedError } = await supabaseAdmin
      .from("load_documents")
      .select(
        `
          id,
          pending_document_id,
          load_id,
          token,
          doc_type,
          original_filename,
          file_path,
          storage_bucket,
          storage_path,
          created_at
        `,
      )
      .eq("token", token)
      .order("created_at", { ascending: false });

    if (approvedError) {
      console.error(
        "Error fetching load_documents for token",
        token,
        approvedError,
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            "Failed to fetch approved documents: " +
            (approvedError.message || approvedError.details || ""),
        },
        { status: 500 },
      );
    }

    // Map approved docs so file_path is ALWAYS usable by the UI
    const approved =
      approvedRaw?.map((doc) => ({
        id: doc.id,
        pending_document_id: doc.pending_document_id,
        token: doc.token,
        doc_type: doc.doc_type,
        original_filename: doc.original_filename,
        // 👇 critical: ensure file_path is filled from storage_path if null
        file_path: doc.file_path ?? doc.storage_path,
        created_at: doc.created_at,
      })) ?? [];

    return NextResponse.json(
      {
        ok: true,
        token,
        load: load ?? null,
        pending: pending ?? [],
        approved,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Fatal error in /api/admin/load-docs/[token]:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unexpected error fetching load documents: " +
          (err?.message || String(err)),
      },
      { status: 500 },
    );
  }
}
