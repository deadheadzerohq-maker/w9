// app/api/notify-doc-upload/route.ts

import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return NextResponse.json(
      { ok: false, error: "Email service not configured" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const { token, docType, fileName, filePath } = body || {};

    if (!token || !docType || !fileName || !filePath) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    await resend.emails.send({
      from: "Deadhead Zero <no-reply@deadheadzero.com>",
      to: ["kyle.godfrey@deadheadzero.com"],
      subject: `New ${docType} uploaded for token ${token}`,
      text: [
        `A new document was uploaded to Deadhead Zero:`,
        "",
        `Type: ${docType}`,
        `File name: ${fileName}`,
        `Storage path: ${filePath}`,
        `Token: ${token}`,
        "",
        `You can review this document in the admin or Supabase UI.`,
      ].join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("notify-doc-upload error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to send notification" },
      { status: 500 },
    );
  }
}
