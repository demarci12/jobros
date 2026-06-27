import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { WorksheetPdf } from "@/lib/pdf/worksheet";
import { QuotePdf } from "@/lib/pdf/quote";

type Kind = "worksheet" | "quote";

export async function GET(
  req: NextRequest,
  { params }: { params: { kind: string; id: string } }
) {
  const kind = params.kind as Kind;
  if (!["worksheet", "quote"].includes(kind)) {
    return NextResponse.json({ error: "Ismeretlen PDF típus." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) return NextResponse.json({ error: "Nincs jogosultság." }, { status: 403 });

  const service = createServiceClient();
  const { data: company } = await service
    .from("companies").select("name, logo_url").eq("id", cu.company_id).single();

  const issuedAt = new Date().toLocaleDateString("hu-HU", { dateStyle: "medium" });

  let pdfElement: React.ReactElement;
  let filename: string;

  if (kind === "worksheet") {
    // Fetch worksheet data
    const { data: ws } = await supabase
      .from("worksheets")
      .select("id, work_done, labor_hours, jobs(job_number, customers(name), sites(address, city), services(name))")
      .eq("id", params.id).eq("company_id", cu.company_id).maybeSingle();
    if (!ws) return NextResponse.json({ error: "Nem található." }, { status: 404 });

    const { data: lines } = await supabase
      .from("worksheet_lines")
      .select("description, quantity, unit, unit_price, vat_rate, line_total, is_labor")
      .eq("worksheet_id", ws.id).order("created_at");

    const job = (ws as any).jobs;
    pdfElement = React.createElement(WorksheetPdf, {
      data: {
        jobNumber: job?.job_number ?? "",
        companyName: company?.name ?? "",
        customerName: job?.customers?.name ?? "",
        siteAddress: `${job?.sites?.address ?? ""}${job?.sites?.city ? `, ${job.sites.city}` : ""}`,
        serviceName: job?.services?.name ?? "",
        workDone: ws.work_done,
        laborHours: ws.labor_hours,
        lines: (lines ?? []) as any,
        issuedAt,
      },
    });
    filename = `munkalap-${job?.job_number ?? params.id}.pdf`;

  } else {
    // quote
    const { data: quote } = await supabase
      .from("quotes")
      .select("id, quote_number, valid_until, notes, jobs(job_number, title, customers(name))")
      .eq("id", params.id).eq("company_id", cu.company_id).maybeSingle();
    if (!quote) return NextResponse.json({ error: "Nem található." }, { status: 404 });

    const { data: lines } = await supabase
      .from("quote_lines")
      .select("description, quantity, unit, unit_price, vat_rate, line_total, is_optional, option_group, is_selected")
      .eq("quote_id", quote.id).order("created_at");

    const job = (quote as any).jobs;
    pdfElement = React.createElement(QuotePdf, {
      data: {
        quoteNumber: quote.quote_number,
        companyName: company?.name ?? "",
        customerName: job?.customers?.name ?? "",
        jobTitle: job?.title ?? job?.job_number ?? "",
        lines: (lines ?? []) as any,
        validUntil: quote.valid_until,
        notes: quote.notes,
        issuedAt,
      },
    });
    filename = `arajanlat-${quote.quote_number}.pdf`;
  }

  const buffer = await renderToBuffer(pdfElement);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
