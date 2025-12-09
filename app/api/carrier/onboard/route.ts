// app/api/carrier/onboard/route.ts

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { runGrokFraudCheck } from "@/lib/grokFraud";

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      null;

    const body = await req.json();

    const {
      legalName,
      dbaName,
      mcNumber,
      dotNumber,
      email,
      phone,

      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      remitAddress,
      taxId,
      primaryContactName,
      primaryContactTitle,
      dispatchPhone,
      afterHoursPhone,

      equipmentType,
      preferredLanes,
      fleetSize,

      operatingRegions,

      agreementChecked,
      esignName,

      documents,
    } = body;

    if (!legalName || !email || !phone || !mcNumber || !dotNumber) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (!agreementChecked || !esignName) {
      return NextResponse.json(
        { error: "Broker–carrier agreement must be accepted." },
        { status: 400 }
      );
    }

    // You pay carriers within 72 hours – hard-set this
    const paymentTerms = "72 hours";

    // 1) Insert carrier
    const now = new Date().toISOString();

    const { data: carrier, error: carrierError } = await supabaseAdmin
      .from("carriers")
      .insert({
        legal_name: legalName,
        dba_name: dbaName,
        mc_number: mcNumber,
        dot_number: dotNumber,
        email,
        phone,

        address_line1: addressLine1,
        address_line2: addressLine2,
        city,
        state,
        postal_code: postalCode,
        remit_address: remitAddress,
        tax_id: taxId,
        primary_contact_name: primaryContactName,
        primary_contact_title: primaryContactTitle,
        dispatch_phone: dispatchPhone,
        after_hours_phone: afterHoursPhone,

        equipment_type: equipmentType,
        preferred_lanes: preferredLanes,
        fleet_size: fleetSize,

        payment_terms: paymentTerms,
        operating_regions: operatingRegions,

        broker_carrier_agreed_at: now,
        esign_name: esignName,
        esign_ip: ip,
        esign_timestamp: now,
        status: "pending",
      })
      .select("*")
      .single();

    if (carrierError || !carrier) {
      console.error("Carrier insert error", carrierError);
      return NextResponse.json(
        { error: "Failed to save carrier." },
        { status: 500 }
      );
    }

    // 2) Insert carrier docs
    if (Array.isArray(documents) && documents.length > 0) {
      const rows = documents.map((d: any) => ({
        carrier_id: carrier.id,
        doc_type: d.docType,
        file_url: d.fileUrl,
        original_filename: d.originalFilename,
        mime_type: d.mimeType,
      }));

      const { error: docsError } = await supabaseAdmin
        .from("carrier_documents")
        .insert(rows);

      if (docsError) {
        console.error("Carrier docs insert error", docsError);
      }
    }

    // 3) Grok fraud/risk scoring – pass the shape it expects
    try {
      const grokResult = await runGrokFraudCheck({
        legalName,
        dbaName,
        mcNumber,
        dotNumber,
        email,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        remitAddress,
        taxId,
        primaryContactName,
        primaryContactTitle,
        dispatchPhone,
        afterHoursPhone,
        equipmentType,
        preferredLanes,
        fleetSize,
        paymentTerms,
        operatingRegions,
        documents: Array.isArray(documents) ? documents : [],
      });

      if (grokResult) {
        await supabaseAdmin
          .from("carriers")
          .update({
            grok_risk_score: grokResult.riskScore,
            grok_risk_label: grokResult.riskLabel,
            grok_summary: grokResult.summary,
          })
          .eq("id", carrier.id);
      }
    } catch (grokErr) {
      console.error("Grok check failed", grokErr);
    }

    return NextResponse.json({ ok: true, carrierId: carrier.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected error." },
      { status: 500 }
    );
  }
}
