import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Wrench, Calendar } from "lucide-react";
import { type JobStatus } from "@/lib/jobs/status-machine";

export default async function JobOverviewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/onboarding");

  const { data: job } = await supabase
    .from("jobs")
    .select(`
      id, description, created_at,
      customers(id, name, phone, email),
      sites(id, address, city),
      services(name)
    `)
    .eq("id", params.id)
    .eq("company_id", cu.company_id)
    .maybeSingle();
  if (!job) notFound();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, kind, starts_at, ends_at, status")
    .eq("job_id", params.id)
    .neq("status", "lemondva")
    .order("starts_at");

  const { data: equipment } = await supabase
    .from("equipment")
    .select("id, name, kind, serial_number, next_service_due")
    .eq("site_id", (job as any).sites?.id ?? "")
    .is("deleted_at", null)
    .order("name");

  return (
    <div className="space-y-5 max-w-lg">
      {/* Ügyfél + telephely */}
      <div className="space-y-3">
        {(job as any).customers && (
          <div className="flex items-start gap-3 text-sm">
            <User size={15} className="mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <Link href={`/customers/${(job as any).customers.id}`} className="font-medium hover:underline">
                {(job as any).customers.name}
              </Link>
              {(job as any).customers.phone && (
                <p className="text-muted-foreground">
                  <a href={`tel:${(job as any).customers.phone}`}>{(job as any).customers.phone}</a>
                </p>
              )}
              {(job as any).customers.email && (
                <p className="text-muted-foreground text-xs">{(job as any).customers.email}</p>
              )}
            </div>
          </div>
        )}

        {(job as any).sites && (
          <div className="flex items-start gap-3 text-sm">
            <MapPin size={15} className="mt-0.5 text-muted-foreground shrink-0" />
            <p>{(job as any).sites.address}{(job as any).sites.city ? `, ${(job as any).sites.city}` : ""}</p>
          </div>
        )}

        {(job as any).services && (
          <div className="flex items-start gap-3 text-sm">
            <Wrench size={15} className="mt-0.5 text-muted-foreground shrink-0" />
            <p>{(job as any).services.name}</p>
          </div>
        )}

        {job.description && (
          <p className="text-sm text-muted-foreground pl-7">{job.description}</p>
        )}
      </div>

      {/* Időpontok */}
      {(appointments ?? []).length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Időpontok</h2>
          <ul className="space-y-1">
            {(appointments ?? []).map((a: any) => (
              <li key={a.id} className="flex items-center gap-3 text-sm border rounded-md px-3 py-2">
                <Calendar size={13} className="text-muted-foreground shrink-0" />
                <span>{a.kind === "felmeres" ? "Felmérés" : "Munka"}</span>
                <span className="text-muted-foreground">
                  {new Date(a.starts_at).toLocaleString("hu-HU", { dateStyle: "short", timeStyle: "short" })}
                </span>
                <Badge variant="outline" className="text-xs ml-auto">{a.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Berendezések a helyszínen */}
      {(equipment ?? []).length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Berendezések</h2>
          <ul className="space-y-1">
            {(equipment ?? []).map((e: any) => {
              const overdue = e.next_service_due && new Date(e.next_service_due) < new Date();
              return (
                <li key={e.id} className="flex items-center gap-3 text-sm border rounded-md px-3 py-2">
                  <span className="font-medium">{e.name}</span>
                  {e.serial_number && <span className="text-muted-foreground text-xs">S/N: {e.serial_number}</span>}
                  {e.next_service_due && (
                    <span className={`text-xs ml-auto ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                      Szerv.: {new Date(e.next_service_due).toLocaleDateString("hu-HU")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
