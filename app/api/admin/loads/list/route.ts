// app/api/admin/loads/list/route.ts

import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";
    const paidStatus = searchParams.get("paid_status") || "";

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
        stripe_invoice_id,
        stripe_invoice_url,
        payment_terms_text,
        payment_due_days,
        shipper_billed_amount,
        paid_status,
        paid_at,
        margin_cached,
        invoice_sent_at,
        ready_to_invoice_at
      `,
      )
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (paidStatus && paidStatus !== "all") {
      query = query.eq("paid_status", paidStatus);
    }

    if (search.trim()) {
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
      console.error("[loads/list] Error fetching loads:", error);
      return NextResponse.json(
        {
          ok: false,
          error: error.message || "Failed to fetch loads from Supabase",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        loads: data || [],
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[loads/list] Unexpected error:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message || "Unexpected server error while fetching loads list",
      },
      { status: 500 },
    );
  }
}
