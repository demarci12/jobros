"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { accountSchema } from "@/lib/validators/settings";

export async function updateAccount(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nincs bejelentkezve." };

  const parsed = accountSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, phone: parsed.data.phone ?? null })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings/account");
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || password.length < 8) return { error: "Legalább 8 karakter szükséges." };
  if (password !== confirm) return { error: "A két jelszó nem egyezik." };

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { success: true };
}
