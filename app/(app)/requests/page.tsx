import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestsClient } from "@/components/requests/RequestsClient";

export default async function RequestsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/onboarding");

  if (!["owner", "dispatcher"].includes(cu.role)) redirect("/dashboard");

  const [{ data: requests }, { data: company }] = await Promise.all([
    supabase.from("booking_requests")
      .select("id, name, phone, email, address, message, status, job_id, created_at, services(name)")
      .eq("company_id", cu.company_id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("companies")
      .select("public_slug")
      .eq("id", cu.company_id)
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
        companyId={cu.company_id}
      />
    </div>
  );
}
