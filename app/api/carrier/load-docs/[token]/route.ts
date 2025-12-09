import { NextResponse } from "next/server";
import  supabaseAdmin  from "@/lib/supabaseAdmin";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const { token } = params;
  const { data: load, error } = await supabaseAdmin
    .from("loads")
    .select("id, reference_number, origin_city, origin_state, dest_city, dest_state, status")
    .eq("upload_token", token)
    .single();

  if (error || !load) {
    return NextResponse.json({ error: "Load not found." }, { status: 404 });
  }

  return NextResponse.json({ load });
}

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const { documents } = await req.json();

    const { data: load, error } = await supabaseAdmin
      .from("loads")
      .select("id")
      .eq("upload_token", token)
      .single();

    if (error || !load) {
      return NextResponse.json({ error: "Load not found." }, { status: 404 });
    }

    if (!Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { error: "No documents provided." },
        { status: 400 }
      );
    }

    const rows = documents.map((d: any) => ({
      load_id: load.id,
      doc_type: d.docType,
      file_url: d.fileUrl,
      original_filename: d.originalFilename,
      mime_type: d.mimeType,
      uploaded_by: "carrier",
    }));

    const { error: docsError } = await supabaseAdmin
      .from("load_documents")
      .insert(rows);

    if (docsError) {
      console.error(docsError);
      return NextResponse.json(
        { error: "Failed to save load documents." },
        { status: 500 }
      );
    }

    // Optionally mark delivered
    await supabaseAdmin
      .from("loads")
      .update({ status: "delivered" })
      .eq("id", load.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected error." },
      { status: 500 }
    );
  }
}
