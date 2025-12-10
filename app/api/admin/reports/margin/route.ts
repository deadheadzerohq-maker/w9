// app/api/admin/reports/margin/route.ts

import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type PaidLoad = {
  id: number;
  shipper_name: string | null;
  shipper_billed_amount: number | null;
  carrier_pay_amount: number | null;
  margin_cached: number | null;
  paid_at: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const shipperFilter = searchParams.get("shipper");

    const now = new Date();

    const defaultTo = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
      ),
    );
    const defaultFrom = new Date(defaultTo);
    defaultFrom.setMonth(defaultFrom.getMonth() - 1); // last 30-ish days

    const fromIso = from
      ? new Date(from).toISOString()
      : defaultFrom.toISOString();
    const toIso = to ? new Date(to).toISOString() : defaultTo.toISOString();

    let query = supabaseAdmin
      .from("loads")
      .select(
        `
        id,
        shipper_name,
        shipper_billed_amount,
        carrier_pay_amount,
        margin_cached,
        paid_at,
        paid_status
      `,
      )
      .eq("paid_status", "paid")
      .gte("paid_at", fromIso)
      .lte("paid_at", toIso);

    if (shipperFilter && shipperFilter.trim().length > 0) {
      query = query.ilike("shipper_name", shipperFilter.trim());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching margin report loads:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch margin report" },
        { status: 500 },
      );
    }

    const loads = (data || []) as PaidLoad[];

    type MonthKey = string; // e.g. 2025-12
    type ShipperKey = string;

    const summary = {
      total_shipper_billed: 0,
      total_carrier_pay: 0,
      total_margin: 0,
    };

    const byMonth: Record<
      MonthKey,
      { shipper_billed: number; carrier_pay: number; margin: number }
    > = {};

    const byShipper: Record<
      ShipperKey,
      { shipper_name: string; shipper_billed: number; carrier_pay: number; margin: number }
    > = {};

    for (const load of loads) {
      const shipperAmount = load.shipper_billed_amount || 0;
      const carrierAmount = load.carrier_pay_amount || 0;
      const margin =
        load.margin_cached !== null && load.margin_cached !== undefined
          ? load.margin_cached
          : shipperAmount - carrierAmount;

      summary.total_shipper_billed += shipperAmount;
      summary.total_carrier_pay += carrierAmount;
      summary.total_margin += margin;

      const paidDate = load.paid_at ? new Date(load.paid_at) : null;
      const monthKey = paidDate
        ? `${paidDate.getUTCFullYear()}-${String(
            paidDate.getUTCMonth() + 1,
          ).padStart(2, "0")}`
        : "unknown";

      if (!byMonth[monthKey]) {
        byMonth[monthKey] = {
          shipper_billed: 0,
          carrier_pay: 0,
          margin: 0,
        };
      }
      byMonth[monthKey].shipper_billed += shipperAmount;
      byMonth[monthKey].carrier_pay += carrierAmount;
      byMonth[monthKey].margin += margin;

      const shipperKey = load.shipper_name || "Unknown";
      if (!byShipper[shipperKey]) {
        byShipper[shipperKey] = {
          shipper_name: shipperKey,
          shipper_billed: 0,
          carrier_pay: 0,
          margin: 0,
        };
      }
      byShipper[shipperKey].shipper_billed += shipperAmount;
      byShipper[shipperKey].carrier_pay += carrierAmount;
      byShipper[shipperKey].margin += margin;
    }

    const byMonthArray = Object.entries(byMonth)
      .map(([month, values]) => ({ month, ...values }))
      .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));

    const byShipperArray = Object.values(byShipper).sort(
      (a, b) => b.margin - a.margin,
    );

    return NextResponse.json(
      {
        ok: true,
        from: fromIso,
        to: toIso,
        summary,
        byMonth: byMonthArray,
        byShipper: byShipperArray,
        count: loads.length,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Unexpected error in margin report:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 },
    );
  }
}
