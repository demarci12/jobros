import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { AccountForm } from "./account-form";

export default async function AccountPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, user } = ctx;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6 max-w-lg">
      <div className="border-b pb-4">
        <h1 className="text-xl font-semibold">Fiók</h1>
        <p className="text-sm text-muted-foreground mt-1">Személyes adatok és jelszó.</p>
      </div>
      <AccountForm
        email={user.email ?? ""}
        fullName={profile?.full_name ?? ""}
        phone={profile?.phone ?? ""}
        hasPassword={user.app_metadata?.provider === "email"}
      />
    </div>
  );
}
