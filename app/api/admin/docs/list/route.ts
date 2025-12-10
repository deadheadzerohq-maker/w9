// app/api/admin/docs/list/route.ts

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status"); // optional: pending/approved/rejected

    let query = supabaseAdmin
      .from("pending_documents")
      .select(
        "id, token, doc_type, original_filename, status, created_at, grok_fraud_score, grok_fraud_label",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("admin/docs/list error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to load documents" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, docs: data || [] });
  } catch (error) {
    console.error("admin/docs/list unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 },
    );
  }
}
