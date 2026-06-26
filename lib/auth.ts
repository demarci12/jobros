import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.object({
  email: z.string().email("Érvénytelen e-mail cím"),
});

export function getMagicLinkRedirectTo() {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
