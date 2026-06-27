import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

// Billingo signs its webhook with HMAC-SHA256 using the API key as secret.
// Header: X-Billingo-Signature: sha256=<hex>
function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    // timing-safe compare
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("x-billingo-signature");
  const webhookSecret = process.env.BILLINGO_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 });
  }

  if (!verifySignature(body, sig, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: { event: string; document_id?: number; nav_state?: string; nav_error_code?: string };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!payload.document_id) return NextResponse.json({ ok: true });

  const externalId = String(payload.document_id);
  const navStatus = payload.nav_state === "DONE" ? "done" : payload.nav_state === "ERROR" ? "error" : "pending";

  const service = createServiceClient();
  const { error } = await service
    .from("invoices")
    .update({
      nav_status: navStatus,
      nav_error: navStatus === "error" ? (payload.nav_error_code ?? "Ismeretlen NAV hiba") : null,
    })
    .eq("external_id", externalId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
