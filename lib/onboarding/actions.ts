"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const onboardingSchema = z.object({
  name: z.string().min(2, "Legalább 2 karakter szükséges"),
  tax_number: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Érvénytelen e-mail cím").optional().or(z.literal("")),
});

export async function completeOnboarding(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    tax_number: formData.get("tax_number") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const service = createServiceClient();

  const { data: company, error: companyError } = await service
    .from("companies")
    .insert({
      name: parsed.data.name,
      tax_number: parsed.data.tax_number ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      plan: "trial",
    })
    .select("id")
    .single();

  if (companyError || !company) {
    return { error: "Cég létrehozása sikertelen. Próbálja újra." };
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const cuResult = await service.from("company_users").insert({
    company_id: company.id,
    user_id: user.id,
    role: "owner",
    is_active: true,
  });

  if (cuResult.error) {
    await service.from("companies").delete().eq("id", company.id);
    return { error: "Regisztráció sikertelen. Próbálja újra." };
  }

  const subResult = await service.from("subscriptions").insert({
    company_id: company.id,
    plan_slug: "trial",
    status: "trialing",
    trial_ends_at: trialEndsAt.toISOString(),
  });

  if (subResult.error) {
    // company ON DELETE CASCADE törli a company_users sort is
    await service.from("companies").delete().eq("id", company.id);
    return { error: "Regisztráció sikertelen. Próbálja újra." };
  }

  redirect("/dashboard");
}
