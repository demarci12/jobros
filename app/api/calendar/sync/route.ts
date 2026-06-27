import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveCalendarProvider } from "@/lib/apps/registry";

async function parseBody(request: Request): Promise<{ appointmentId?: string } | null> {
  try {
    return await request.json() as { appointmentId?: string };
  } catch {
    return null;
  }
}

// POST /api/calendar/sync — push a single appointment to the company's calendar connector
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu || !["owner", "dispatcher"].includes(cu.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await parseBody(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const { appointmentId } = body;
  if (!appointmentId) return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });

  const service = createServiceClient();
  const { data: appt } = await service
    .from("appointments")
    .select(`
      id, starts_at, ends_at, kind, notes, gcal_event_id,
      jobs (title, sites (address))
    `)
    .eq("id", appointmentId)
    .eq("company_id", cu.company_id)
    .maybeSingle();

  if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  const provider = await resolveCalendarProvider(cu.company_id);
  if (!provider) return NextResponse.json({ error: "No calendar connector installed" }, { status: 422 });

  const job = Array.isArray(appt.jobs) ? appt.jobs[0] : appt.jobs;
  const site = Array.isArray((job as any)?.sites) ? (job as any).sites[0] : (job as any)?.sites;

  const event = {
    title: (job as any)?.title ?? "Kiszállás",
    description: appt.notes ?? undefined,
    start: new Date(appt.starts_at),
    end: new Date(appt.ends_at),
    location: (site as any)?.address ?? undefined,
  };

  if (appt.gcal_event_id) {
    await provider.updateEvent(appt.gcal_event_id, event);
    return NextResponse.json({ updated: true, externalId: appt.gcal_event_id });
  } else {
    const result = await provider.pushEvent(user.id, event);
    await service.from("appointments")
      .update({ gcal_event_id: result.externalId })
      .eq("id", appointmentId);
    return NextResponse.json({ pushed: true, externalId: result.externalId });
  }
}

// DELETE /api/calendar/sync — remove appointment from calendar
export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu || !["owner", "dispatcher"].includes(cu.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await parseBody(request);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const { appointmentId } = body;
  if (!appointmentId) return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });

  const service = createServiceClient();
  const { data: appt } = await service
    .from("appointments").select("id, gcal_event_id")
    .eq("id", appointmentId).eq("company_id", cu.company_id).maybeSingle();
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (appt.gcal_event_id) {
    const provider = await resolveCalendarProvider(cu.company_id);
    if (provider) await provider.deleteEvent(appt.gcal_event_id);
    await service.from("appointments")
      .update({ gcal_event_id: null })
      .eq("id", appointmentId);
  }

  return NextResponse.json({ removed: true });
}
