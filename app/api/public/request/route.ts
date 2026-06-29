import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const RequestSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  address: z.string().max(500).optional().nullable(),
  service_id: z.string().uuid().optional().nullable().or(z.literal("")),
  message: z.string().max(2000).optional().nullable(),
});

function getRatelimiter(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    prefix: "jobro:public-request",
  });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limiter = getRatelimiter();
  if (limiter) {
    const { success } = await limiter.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Túl sok kérés. Kérjük, próbálja újra később." }, { status: 429 });
    }
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

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Szerverhiba: a szolgáltatás jelenleg nem elérhető." }, { status: 503 });
  }

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
