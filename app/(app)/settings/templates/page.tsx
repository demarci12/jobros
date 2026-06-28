import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TemplatesClient } from "@/components/jobs/TemplatesClient";

export default async function TemplatesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cu } = await supabase
    .from("company_users").select("company_id, role")
    .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
  if (!cu) redirect("/dashboard");

  const canEdit = ["owner", "dispatcher"].includes(cu.role);

  const [{ data: templates }, { data: enums }] = await Promise.all([
    supabase.from("job_templates")
      .select("id, name, activity, checklist_items(id, label, sort_order, is_required)")
      .eq("company_id", cu.company_id)
      .order("name"),
    // activity enum values derived from the rendszerterv — static list
    Promise.resolve({ data: null }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Job sablonok</h1>
        <p className="text-sm text-muted-foreground">
          Sablonokkal előre definiált ellenőrzőlistákat rendelhet a munkatípusokhoz.
        </p>
      </div>
      <TemplatesClient
        initialTemplates={(templates ?? []) as any}
        canEdit={canEdit}
      />
    </div>
  );
}
