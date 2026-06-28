"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { companySchema } from "@/lib/validators/settings";

export async function updateCompany(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx || ctx.role !== "owner") return { error: "Csak az owner szerkesztheti a cégadatokat." };
  const { supabase, companyId } = ctx;

  const rawSlug = (formData.get("public_slug") as string || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    tax_number: formData.get("tax_number") || undefined,
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { error } = await supabase
    .from("companies")
    .update({
      name: parsed.data.name,
      tax_number: parsed.data.tax_number ?? null,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      public_slug: rawSlug || null,
    })
    .eq("id", companyId);

  if (error) return { error: error.message };
  revalidatePath("/settings/company");
  return { success: true };
}
