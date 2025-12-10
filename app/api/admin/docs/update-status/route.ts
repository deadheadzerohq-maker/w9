// app/api/admin/docs/update-status/route.ts

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { docId, status } = body || {};

    if (!docId || !status) {
      return NextResponse.json(
        { ok: false, error: "Missing docId or status" },
        { status: 400 },
      );
    }

    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status" },
        { status: 400 },
      );
    }

    // 1) Fetch the pending document row
    const { data: doc, error: docError } = await supabaseAdmin
      .from("pending_documents")
      .select(
        "id, token, doc_type, file_path, original_filename, created_at, status",
      )
      .eq("id", docId)
      .single();

    if (docError || !doc) {
      console.error("update-status: doc not found", docError);
      return NextResponse.json(
        { ok: false, error: "Document not found" },
        { status: 404 },
      );
    }

    // 2) Update status on pending_documents
    const { error: updatePendingError } = await supabaseAdmin
      .from("pending_documents")
      .update({ status })
      .eq("id", doc.id);

    if (updatePendingError) {
      console.error("update-status: pending update error", updatePendingError);
      return NextResponse.json(
        { ok: false, error: "Failed to update status" },
        { status: 500 },
      );
    }

    let promoted = false;

    // 3) If approved, "promote" into load_documents
    if (status === "approved") {
      const { error: promoteError } = await supabaseAdmin
        .from("load_documents")
        .insert({
          // Assumes these columns exist; see SQL note at bottom
          pending_document_id: doc.id,
          token: doc.token,
          doc_type: doc.doc_type,
          file_path: doc.file_path,
          original_filename: doc.original_filename,
          created_at: new Date().toISOString(),
        });

      if (promoteError) {
        console.error("update-status: promote error", promoteError);
      } else {
        promoted = true;
      }
    }

    return NextResponse.json({
      ok: true,
      status,
      promoted,
    });
  } catch (error) {
    console.error("update-status unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 },
    );
  }
}
