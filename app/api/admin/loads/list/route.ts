// app/api/admin/loads/list/route.ts

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "all";
    const q = url.searchParams.get("q") || "";

    let query = supabaseAdmin
      .from("loads")
      .select(
        `
        id,
        token,
        reference,
        status,
        shipper_name,
        receiver_name,
        origin_city,
        origin_state,
        dest_city,
        dest_state,
        pickup_date,
        delivery_date,
        carrier_name,
        carrier_email,
        rate,
        created_at
      `,
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (q) {
      const pattern = `%${q}%`;
      query = query.or(
        `reference.ilike.${pattern},carrier_name.ilike.${pattern},carrier_email.ilike.${pattern},origin_city.ilike.${pattern},dest_city.ilike.${pattern}`,
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("admin/loads/list error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to load loads" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      loads: data || [],
    });
  } catch (error) {
    console.error("admin/loads/list unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 },
    );
  }
}
