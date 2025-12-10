// app/api/admin/loads/[id]/mark-paid/route.ts

import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid load id" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));

    const {
      shipperBilledAmount,
      carrierPayAmount,
      paidStatus,
      paidAt,
    }: {
      shipperBilledAmount?: number | string;
      carrierPayAmount?: number | string;
      paidStatus?: string;
      paidAt?: string;
    } = body || {};

    const shipperAmountNumber =
      shipperBilledAmount !== undefined && shipperBilledAmount !== null
        ? Number(shipperBilledAmount)
        : null;

    const carrierAmountNumber =
      carrierPayAmount !== undefined && carrierPayAmount !== null
        ? Number(carrierPayAmount)
        : null;

    if (
      shipperAmountNumber !== null &&
      (Number.isNaN(shipperAmountNumber) || !Number.isFinite(shipperAmountNumber))
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid shipperBilledAmount" },
        { status: 400 },
      );
    }

    if (
      carrierAmountNumber !== null &&
      (Number.isNaN(carrierAmountNumber) ||
        !Number.isFinite(carrierAmountNumber))
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid carrierPayAmount" },
        { status: 400 },
      );
    }

    const statusToUse =
      paidStatus && paidStatus.length > 0 ? paidStatus : "paid";

    const paidAtToUse =
      paidAt && paidAt.length > 0 ? new Date(paidAt).toISOString() : new Date().toISOString();

    let margin: number | null = null;
    if (shipperAmountNumber !== null && carrierAmountNumber !== null) {
      margin = shipperAmountNumber - carrierAmountNumber;
    }

    const updatePayload: Record<string, any> = {
      paid_status: statusToUse,
      paid_at: paidAtToUse,
    };

    if (shipperAmountNumber !== null) {
      updatePayload.shipper_billed_amount = shipperAmountNumber;
    }
    if (carrierAmountNumber !== null) {
      updatePayload.carrier_pay_amount = carrierAmountNumber;
    }
    if (margin !== null) {
      updatePayload.margin_cached = margin;
    }

    const { data, error } = await supabaseAdmin
      .from("loads")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Error updating load paid status:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to update paid status" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        load: data,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Unexpected error in mark-paid:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 },
    );
  }
}
