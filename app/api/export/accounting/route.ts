import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu || !["owner", "dispatcher"].includes(cu.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = supabase
    .from("invoices")
    .select(`
      id, invoice_number, gross_total, nav_status, issued_at, created_at,
      jobs (
        job_number,
        customers (name, email, tax_number)
      )
    `)
    .eq("company_id", cu.company_id)
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from);
  if (to)   query = query.lte("created_at", to + "T23:59:59Z");

  const { data: invoices, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (invoices ?? []).map(inv => {
    const job = (inv as any).jobs;
    const customer = job?.customers;
    return [
      inv.invoice_number ?? "",
      customer?.name ?? "",
      customer?.tax_number ?? "",
      customer?.email ?? "",
      job?.job_number ?? "",
      inv.gross_total ?? "",
      inv.nav_status ?? "",
      inv.issued_at ? new Date(inv.issued_at).toLocaleDateString("hu-HU") : "",
      new Date(inv.created_at).toLocaleDateString("hu-HU"),
    ];
  });

  const header = [
    "Számlaszám",
    "Ügyfél neve",
    "Adószám",
    "Email",
    "Munkaszám",
    "Bruttó összeg (HUF)",
    "NAV státusz",
    "Kiállítás dátuma",
    "Rögzítés dátuma",
  ];

  const csvLines = [header, ...rows].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";")
  );
  const csv = "﻿" + csvLines.join("\r\n"); // BOM for Excel UTF-8

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="szamlak-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
