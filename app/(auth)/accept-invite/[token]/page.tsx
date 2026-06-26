import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteClient } from "./accept-invite-client";

export default async function AcceptInvitePage({ params }: { params: { token: string } }) {
  const supabase = createClient();
  const { token } = params;

  const { data: inv } = await supabase
    .from("invitations")
    .select("id, company_id, email, role, expires_at, accepted_at, companies(name)")
    .eq("token", token)
    .maybeSingle();

  if (!inv) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Érvénytelen vagy lejárt meghívó.</p>
      </div>
    );
  }

  if (inv.accepted_at) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Ez a meghívó már fel lett használva.</p>
      </div>
    );
  }

  if (new Date(inv.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">A meghívó lejárt.</p>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    if (user.email !== inv.email) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4 text-center">
          <div>
            <p className="font-semibold">Eltérő e-mail cím</p>
            <p className="text-sm text-muted-foreground mt-1">
              A meghívó a <strong>{inv.email}</strong> címre szól, de te más fiókkal vagy bejelentkezve.
            </p>
          </div>
        </div>
      );
    }

    const { data: cu } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("company_id", inv.company_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cu) {
      await supabase.from("company_users").insert({
        company_id: inv.company_id,
        user_id: user.id,
        role: inv.role,
        is_active: true,
      });
    }

    await supabase
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", inv.id);

    redirect("/dashboard");
  }

  const companyName = (inv.companies as any)?.name ?? "ismeretlen cég";

  return (
    <AcceptInviteClient
      token={token}
      email={inv.email}
      companyName={companyName}
    />
  );
}
