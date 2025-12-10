// app/api/load-docs/fraud-check/route.ts

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { runGrokFraudCheck } from "@/lib/grokFraud";

const BUCKET = "load-documents"; // Supabase STORAGE bucket name

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { docId } = body || {};

    if (!docId) {
      return NextResponse.json(
        { ok: false, error: "Missing docId" },
        { status: 400 },
      );
    }

    // 1) Look up the pending document row
    const { data: doc, error: docError } = await supabaseAdmin
      .from("pending_documents")
      .select(
        "id, token, doc_type, file_path, original_filename, created_at, status",
      )
      .eq("id", docId)
      .single();

    if (docError || !doc) {
      console.error("fraud-check: could not find doc", docError);
      return NextResponse.json(
        { ok: false, error: "Document not found" },
        { status: 404 },
      );
    }

    // 2) Create a short-lived signed URL for Grok to inspect the file
    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(doc.file_path, 60 * 10); // 10 minutes

    if (signedError || !signed?.signedUrl) {
      console.error("fraud-check: signed URL error", signedError);
      // Not fatal; Grok can still work metadata-only if needed
    }

    const fileUrl = signed?.signedUrl ?? null;

    // 3) Build payload for Grok
    const grokPayload = {
      kind: "load_document_upload",
      payload: {
        id: doc.id,
        token: doc.token,
        doc_type: doc.doc_type,
        original_filename: doc.original_filename,
        created_at: doc.created_at,
        status: doc.status,
        storage_bucket: BUCKET,
        storage_path: doc.file_path,
        file_url: fileUrl,
      },
    };

    // 4) Call Grok fraud engine
    // Cast to any so we can reuse runGrokFraudCheck with a different payload shape
    const result = await (runGrokFraudCheck as any)(grokPayload);

    // Normalize result shape
    const score =
      (result as any)?.score ??
      (result as any)?.riskScore ??
      (result as any)?.grok_score ??
      null;

    const label =
      (result as any)?.label ??
      (result as any)?.riskLabel ??
      (result as any)?.grok_label ??
      "unknown";

    const notes = (result as any)?.notes ?? result ?? null;

    // 5) Store results back on pending_documents
    const { error: updateError } = await supabaseAdmin
      .from("pending_documents")
      .update({
        grok_fraud_score: score,
        grok_fraud_label: label,
        grok_fraud_notes: notes,
        fraud_checked_at: new Date().toISOString(),
      })
      .eq("id", doc.id);

    if (updateError) {
      console.error("fraud-check: update error", updateError);
      return NextResponse.json(
        { ok: false, error: "Could not store fraud result" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      docId: doc.id,
      grok: { score, label },
    });
  } catch (error) {
    console.error("fraud-check route error:", error);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 },
    );
  }
}
