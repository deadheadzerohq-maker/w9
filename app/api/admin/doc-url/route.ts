// app/api/admin/doc-url/route.ts

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

const BUCKET = "load-documents"; // Supabase storage bucket name

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filePath } = body || {};

    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid filePath" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 60 * 10); // 10 minutes

    if (error || !data?.signedUrl) {
      console.error("doc-url signed URL error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to generate signed URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, url: data.signedUrl });
  } catch (error) {
    console.error("doc-url unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 },
    );
  }
}
