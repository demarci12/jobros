import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { CompanyForm } from "./company-form";

export default async function CompanyPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role } = ctx;

  const { data: company } = await supabase
    .from("companies")
    .select("name, tax_number, address, phone, email, public_slug")
    .eq("id", companyId)
    .maybeSingle();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jobros.vercel.app";

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold">Cégadatok</h1>
        <p className="text-sm text-muted-foreground mt-1">Számlázáshoz és nyilvános profilhoz.</p>
      </div>
      <CompanyForm company={company} isOwner={role === "owner"} siteUrl={siteUrl} />
    </div>
  );
}
