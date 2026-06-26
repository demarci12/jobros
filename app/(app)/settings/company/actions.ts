"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { companySchema } from "@/lib/validators/settings";

async function getOwnerCompanyId() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: cu } = await supabase
    .from("company_users")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!cu || cu.role !== "owner") return null;
  return cu.company_id as string;
}

export async function updateCompany(formData: FormData) {
  const companyId = await getOwnerCompanyId();
  if (!companyId) return { error: "Csak az owner szerkesztheti a cégadatokat." };

  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    tax_number: formData.get("tax_number") || undefined,
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name: parsed.data.name,
      tax_number: parsed.data.tax_number ?? null,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
    })
    .eq("id", companyId);

  if (error) return { error: error.message };
  revalidatePath("/settings/company");
  return { success: true };
}
