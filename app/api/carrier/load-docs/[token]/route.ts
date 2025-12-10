// app/api/carrier/load-docs/[token]/route.ts

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { runGrokFraudCheck } from "@/lib/grokFraud";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { token: string } },
) {
  try {
    const token = params.token;
    const formData = await req.formData();

    const docType = formData.get("docType")?.toString();
    const files = formData.getAll("files") as File[];

    if (!token || !docType) {
      return NextResponse.json(
        { error: "Missing token or docType" },
        { status: 400 },
      );
    }

    if (!files.length) {
      return NextResponse.json(
        { error: "No files received" },
        { status: 400 },
      );
    }

    const bucket = "load-documents";
    const inserted: any[] = [];

    for (const file of files) {
      const safeName = file.name.replace(/\s+/g, "_");
      const fileName = `${crypto.randomUUID()}-${safeName}`;
      const storagePath = `${token}/${fileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return NextResponse.json(
          { error: "Failed to upload to storage" },
          { status: 500 },
        );
      }

      const { data: pendingRow, error: insertError } = await supabaseAdmin
        .from("pending_documents")
        .insert({
          token,
          doc_type: docType,
          storage_bucket: bucket,
          storage_path: storagePath,
          original_filename: file.name,
          status: "pending",
        })
        .select("*")
        .single();

      if (insertError || !pendingRow) {
        console.error("Failed to insert pending_documents:", insertError);
        return NextResponse.json(
          { error: "Failed to record document in database" },
          { status: 500 },
        );
      }

      // Best-effort Grok fraud check, non-blocking
      try {
        const fraud = await runGrokFraudCheck({
          pending_document_id: pendingRow.id,
          token,
          docType,
          storageBucket: bucket,
          storagePath,
        });

        if (fraud) {
          await supabaseAdmin
            .from("pending_documents")
            .update({
              fraud_label: fraud.label ?? fraud.fraud_label ?? null,
              fraud_score: fraud.score ?? fraud.fraud_score ?? null,
              fraud_notes: fraud.notes ?? fraud.fraud_notes ?? null,
            })
            .eq("id", pendingRow.id);
        }
      } catch (err) {
        console.error("Grok fraud check error (non-fatal):", err);
      }

      inserted.push(pendingRow);
    }

    return NextResponse.json({ ok: true, inserted });
  } catch (err) {
    console.error("upload-docs route fatal error:", err);
    return NextResponse.json(
      { error: "Unexpected error while uploading documents" },
      { status: 500 },
    );
  }
}
