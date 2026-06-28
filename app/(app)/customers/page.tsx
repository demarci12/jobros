import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/EmptyState";
import { AddCustomerButton } from "./customers-client";
import { Users, Phone } from "lucide-react";

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/dashboard");

  const canEdit = ["owner", "dispatcher"].includes(cu.role);
  const q = searchParams.q?.trim() ?? "";

  let query = supabase
    .from("customers")
    .select("id, name, phone, email, sites(address, city, zip)")
    .eq("company_id", cu.company_id)
    .is("deleted_at", null)
    .order("name")
    .limit(50);

  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data: customers } = await query;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Ügyfelek</h1>
        <AddCustomerButton canEdit={canEdit} />
      </div>

      <form method="GET">
        <Input name="q" defaultValue={q} placeholder="Keresés névben, telefonban…" className="max-w-sm" />
      </form>

      {(customers ?? []).length === 0 ? (
        <EmptyState icon={Users} title="Még nincs ügyfél" description="Telefon-intake-kel adj hozzá az első ügyfelet." />
      ) : (
        <ul className="divide-y rounded-lg border">
          {(customers ?? []).map((c: any) => {
            const firstSite = Array.isArray(c.sites) ? c.sites[0] : c.sites;
            const addr = firstSite
              ? [firstSite.zip, firstSite.address, firstSite.city].filter(Boolean).join(" ").trim()
              : null;
            return (
              <li key={c.id}>
                <Link href={`/customers/${c.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium">{c.name}</p>
                    {addr && <p className="text-xs text-muted-foreground truncate">{addr}</p>}
                  </div>
                  {c.phone && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1 shrink-0 ml-3">
                      <Phone size={13} />{c.phone}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
