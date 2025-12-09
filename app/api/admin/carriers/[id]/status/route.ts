// app/api/admin/carriers/[id]/status/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

type Params = {
  params: { id: string };
};

export async function POST(req: Request, { params }: Params) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const { status, notes } = body as { status: string; notes?: string };

  if (!["pending", "approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const { error } = await supabase
    .from("carriers")
    .update({
      status,
      internal_notes: notes || null,
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update carrier status:", error);
    return NextResponse.json(
      { error: "Failed to update status." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
