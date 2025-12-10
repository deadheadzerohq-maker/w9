// app/api/admin/loads/list/route.ts

import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const ALLOWED_STATUSES = [
  "created",
  "dispatched",
  "in_transit",
  "docs_received",
  "ready_to_invoice",
  "delivered",
  "completed",
  "archived",
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const rawStatus = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";

    let query = supabaseAdmin
      .from("loads")
      .select(
        `
        id,
        token,
        reference,
        status,
        shipper_name,
        shipper_email,
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
        created_at,
        shipper_billed_amount,
        carrier_pay_amount,
        paid_status,
        paid_at,
        margin_cached
      `,
      )
      .order("created_at", { ascending: false });

    if (rawStatus !== "all" && ALLOWED_STATUSES.includes(rawStatus)) {
      query = query.eq("status", rawStatus);
    }

    if (search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      query = query.or(
        [
          `reference.ilike.${term}`,
          `shipper_name.ilike.${term}`,
          `receiver_name.ilike.${term}`,
          `carrier_name.ilike.${term}`,
          `origin_city.ilike.${term}`,
          `dest_city.ilike.${term}`,
        ].join(","),
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching loads:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch loads" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        loads: data ?? [],
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Unexpected error in loads list:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 },
    );
  }
}
