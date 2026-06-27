import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveInvoicingProvider } from "@/lib/apps/registry";
import { assertTransition, type JobStatus } from "@/lib/jobs/status-machine";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu || !["owner", "dispatcher"].includes(cu.role)) {
    return NextResponse.json({ error: "Nincs jogosultság." }, { status: 403 });
  }

  const jobId = params.id;

  // Csak kesz jobból lehet számlázni
  const { data: job } = await supabase
    .from("jobs")
    .select("id, status, customers(name, tax_number, email), sites(address, city), worksheet_lines:worksheets(id, worksheet_lines(description, quantity, unit, unit_price, vat_rate))")
    .eq("id", jobId).eq("company_id", cu.company_id).maybeSingle();

  if (!job) return NextResponse.json({ error: "Munka nem található." }, { status: 404 });
  if (job.status !== "kesz") return NextResponse.json({ error: "Csak lezárt (kész) munkához lehet számlát kiállítani." }, { status: 422 });

  const idempotencyKey = `job:${jobId}:invoice`;

  // Idempotency check — ha már van számla, adjuk vissza
  const service = createServiceClient();
  const { data: existing } = await service
    .from("invoices")
    .select("id, invoice_number, pdf_url, gross_total, nav_status")
    .eq("company_id", cu.company_id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) return NextResponse.json({ invoice: existing, alreadyExisted: true });

  // Connector feloldás
  const provider = await resolveInvoicingProvider(cu.company_id);
  if (!provider) {
    return NextResponse.json({ error: "Nincs aktív számlázó integráció. Állítsd be a Beállítások → Integrációk oldalon." }, { status: 422 });
  }

  // Összegyűjtjük a munkalap tételeket számlázáshoz
  const worksheets = (job as any).worksheet_lines ?? [];
  const allLines = worksheets.flatMap((w: any) => w.worksheet_lines ?? []);

  const customer = (job as any).customers;
  const site = (job as any).sites;

  let result;
  try {
    result = await provider.issueInvoice({
      idempotencyKey,
      customerName: customer?.name ?? "Ismeretlen ügyfél",
      customerTaxNumber: customer?.tax_number ?? undefined,
      customerEmail: customer?.email ?? undefined,
      items: allLines.map((l: any) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unit_price,
        vatRate: l.vat_rate,
      })),
      issuerCompanyId: cu.company_id,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  // Státuszgép validálás (vasszabály: assertTransition mindig)
  try {
    assertTransition(job.status as JobStatus, "szamlazva");
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  // Rögzítjük az invoices táblában
  const { data: invoice, error: insertErr } = await service.from("invoices").insert({
    company_id: cu.company_id,
    job_id: jobId,
    external_id: result.externalId,
    invoice_number: result.invoiceNumber,
    gross_total: result.grossTotal ?? null,
    nav_status: result.navStatus,
    pdf_url: result.pdfUrl ?? null,
    idempotency_key: idempotencyKey,
    issued_at: new Date().toISOString(),
  }).select("id, invoice_number, pdf_url, gross_total, nav_status").single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Job státusz → szamlazva (státuszgép már validálta)
  await service.from("jobs").update({ status: "szamlazva" }).eq("id", jobId);

  return NextResponse.json({ invoice });
}
