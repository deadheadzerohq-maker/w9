// app/api/admin/load-docs/[token]/route.ts

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function GET(
  request: Request,
  context: { params: { token: string } },
) {
  try {
    const token = decodeURIComponent(context.params.token);

    // Pending docs for this token
    const { data: pending, error: pendingError } = await supabaseAdmin
      .from("pending_documents")
      .select(
        "id, doc_type, original_filename, file_path, status, created_at, grok_fraud_score, grok_fraud_label",
      )
      .eq("token", token)
      .order("created_at", { ascending: true });

    if (pendingError) {
      console.error("admin/load-docs pending error:", pendingError);
    }

    // Approved docs promoted into load_documents for this token
    const { data: approved, error: approvedError } = await supabaseAdmin
      .from("load_documents")
      .select(
        "id, pending_document_id, token, doc_type, original_filename, file_path, created_at",
      )
      .eq("token", token)
      .order("created_at", { ascending: true });

    if (approvedError) {
      console.error("admin/load-docs approved error:", approvedError);
    }

    return NextResponse.json({
      ok: true,
      token,
      pending: pending || [],
      approved: approved || [],
    });
  } catch (error) {
    console.error("admin/load-docs unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 },
    );
  }
}
