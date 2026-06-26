import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanyForm } from "./company-form";

export default async function CompanyPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!cu) redirect("/onboarding");

  const { data: company } = await supabase
    .from("companies")
    .select("name, tax_number, address, phone, email")
    .eq("id", cu.company_id)
    .single();

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold">Cégadatok</h1>
        <p className="text-sm text-muted-foreground mt-1">Számlázáshoz és nyilvános profilhoz.</p>
      </div>
      <CompanyForm company={company} isOwner={cu.role === "owner"} />
    </div>
  );
}
