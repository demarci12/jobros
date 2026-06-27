import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";

const RequestSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  address: z.string().max(500).optional().nullable(),
  service_id: z.string().uuid().optional().nullable().or(z.literal("")),
  message: z.string().max(2000).optional().nullable(),
});

// Simple in-memory rate limit: max 5 submissions per IP per 10 min
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Túl sok kérés. Kérjük, próbálja újra később." }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Érvénytelen kérés." }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Érvénytelen adatok." }, { status: 400 });
  }

  const { slug, name, phone, email, address, service_id, message } = parsed.data;

  const service = createServiceClient();

  const { data: company } = await service
    .from("companies")
    .select("id")
    .eq("public_slug", slug)
    .maybeSingle();

  if (!company) {
    return NextResponse.json({ error: "Ismeretlen cég." }, { status: 404 });
  }

  const { error: insertErr } = await service.from("booking_requests").insert({
    company_id: company.id,
    name,
    phone: phone || null,
    email: email || null,
    address: address || null,
    service_id: service_id || null,
    message: message || null,
    status: "new",
  });

  if (insertErr) {
    return NextResponse.json({ error: "Nem sikerült elmenteni a kérést." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
