// app/api/admin/loads/list/route.ts

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status") || "all";

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
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      // basic multi-field search
      const pattern = `%${search}%`;
      query = query.or(
        [
          `reference.ilike.${pattern}`,
          `shipper_name.ilike.${pattern}`,
          `receiver_name.ilike.${pattern}`,
          `carrier_name.ilike.${pattern}`,
          `origin_city.ilike.${pattern}`,
          `dest_city.ilike.${pattern}`,
        ].join(","),
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching loads:", error);
      return NextResponse.json(
        {
          ok: false,
          error:
            "Failed to fetch loads: " +
            (error.message || error.details || "Unknown error"),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, loads: data ?? [] }, { status: 200 });
  } catch (err: any) {
    console.error("Fatal error in /api/admin/loads/list:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unexpected error listing loads: " + (err?.message || String(err)),
      },
      { status: 500 },
    );
  }
}
