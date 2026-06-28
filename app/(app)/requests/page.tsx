import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { RequestsClient } from "@/components/requests/RequestsClient";

export default async function RequestsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role } = ctx;

  if (!["owner", "dispatcher"].includes(role)) redirect("/dashboard");

  const [{ data: requests }, { data: company }] = await Promise.all([
    supabase.from("booking_requests")
      .select("id, name, phone, email, address, message, status, job_id, created_at, services(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("companies")
      .select("public_slug")
      .eq("id", companyId)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Beérkező ajánlatkérések</h1>
        <p className="text-sm text-muted-foreground">
          Publikus link:{" "}
          {company?.public_slug ? (
            <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              /public/{company.public_slug}/request
            </span>
          ) : (
            <span className="text-xs italic">
              Állíts be publikus URL-t a Beállítások → Cégadatok oldalon.
            </span>
          )}
        </p>
      </div>
      <RequestsClient
        initialRequests={(requests ?? []) as any}
        companyId={companyId}
      />
    </div>
  );
}
