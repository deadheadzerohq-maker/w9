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

    // We’ll look up the load once so we can give Grok some context
    const { data: load, error: loadError } = await supabaseAdmin
      .from("loads")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (loadError) {
      console.error("Error fetching load for Grok context:", loadError);
    }

    for (const file of files) {
      const safeName = file.name.replace(/\s+/g, "_");
      const fileName = `${crypto.randomUUID()}-${safeName}`;
      const storagePath = `${token}/${fileName}`;

      // --- Upload to Supabase Storage ---
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

      // --- Insert pending_documents row ---
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

      // --- Grok fraud check (best-effort, non-blocking) ---
      try {
        // Create a short-lived signed URL for Grok to inspect if your Grok
        // helper ever looks at document URLs. If it doesn’t, this is harmless.
        const { data: signed, error: signError } =
          await supabaseAdmin.storage
            .from(bucket)
            .createSignedUrl(storagePath, 60 * 10);

        if (signError) {
          console.error("Error creating signed URL for Grok:", signError);
        }

        // Build a payload that roughly matches your existing Grok carrier shape.
        // We cast to any so TypeScript doesn’t complain about extra/missing keys.
        const grokInput: any = {
          // Carrier identity context (fallbacks are empty strings)
          legalName: load?.carrier_name ?? "",
          dbaName: "",
          mcNumber: "",
          dotNumber: "",
          email: load?.carrier_email ?? "",
          phone: "",
          addressLine1: "",
          addressLine2: "",
          city: load?.origin_city ?? "",
          state: load?.origin_state ?? "",
          postalCode: "",
          country: "US",

          // Basic load context
          lane: `${load?.origin_city ?? ""}, ${load?.origin_state ?? ""} -> ${
            load?.dest_city ?? ""
          }, ${load?.dest_state ?? ""}`,
          pickupDate: load?.pickup_date ?? null,
          deliveryDate: load?.delivery_date ?? null,
          reference: load?.reference ?? null,
          rateToCarrier: load?.rate ?? null,

          // Single document for this call
          documents: [
            {
              type: docType,
              url: signed?.signedUrl ?? null,
              filename: file.name,
              storageBucket: bucket,
              storagePath,
            },
          ],

          // Extra context for your own future use
          meta: {
            source: "load_document_upload",
            pending_document_id: pendingRow.id,
            token,
          },
        };

        const fraud: any = await runGrokFraudCheck(grokInput as any);

        if (fraud) {
          await supabaseAdmin
            .from("pending_documents")
            .update({
              fraud_label:
                fraud.label ??
                fraud.fraud_label ??
                fraud.risk_label ??
                null,
              fraud_score:
                fraud.score ??
                fraud.fraud_score ??
                fraud.risk_score ??
                null,
              fraud_notes:
                fraud.notes ??
                fraud.fraud_notes ??
                fraud.explanation ??
                null,
            })
            .eq("id", pendingRow.id);
        }
      } catch (err) {
        console.error("Grok fraud check error (non-fatal):", err);
        // We do NOT fail the upload if Grok has issues
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
