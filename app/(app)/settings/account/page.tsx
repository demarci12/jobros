import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "./account-form";

export default async function AccountPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6 max-w-lg">
      <div>
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
