import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { TeamClient } from "./team-client";

export default async function TeamPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role, user } = ctx;

  const { data: members } = await supabase
    .from("company_users")
    .select("user_id, role, is_active, trades, profiles(full_name, phone)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  const canManage = ["owner", "dispatcher"].includes(role);

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
