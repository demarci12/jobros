import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/EmptyState";
import { AddCustomerButton } from "./customers-client";
import { Users, Phone } from "lucide-react";

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role } = ctx;

  const canEdit = ["owner", "dispatcher"].includes(role);
  const q = searchParams.q?.trim() ?? "";

  let query = supabase
    .from("customers")
    .select("id, name, phone, email, sites(address, city, zip)")
    .eq("company_id", companyId)
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
