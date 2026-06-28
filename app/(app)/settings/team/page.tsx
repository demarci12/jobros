import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamClient } from "./team-client";

export default async function TeamPage() {
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

  const { data: members } = await supabase
    .from("company_users")
    .select("user_id, role, is_active, trades, profiles(full_name, phone)")
    .eq("company_id", cu.company_id)
    .order("created_at", { ascending: true });

  const canManage = ["owner", "dispatcher"].includes(cu.role);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Csapat</h1>
        <p className="text-sm text-muted-foreground mt-1">Tagok, szerepkörök és meghívók kezelése.</p>
      </div>
      <TeamClient
        members={(members ?? []) as any}
        canManage={canManage}
        currentUserId={user.id}
      />
    </div>
  );
}
