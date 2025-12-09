// app/api/admin/carriers/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET() {
  const { data, error } = await supabase
    .from("carriers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Failed to fetch carriers:", error);
    return NextResponse.json({ carriers: [] }, { status: 500 });
  }

  return NextResponse.json({ carriers: data || [] });
}
