import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { TemplatesClient } from "@/components/jobs/TemplatesClient";

export default async function TemplatesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { supabase, companyId, role } = ctx;

  const canEdit = ["owner", "dispatcher"].includes(role);

  const [{ data: templates }, { data: enums }] = await Promise.all([
    supabase.from("job_templates")
      .select("id, name, activity, checklist_items(id, label, sort_order, is_required)")
      .eq("company_id", companyId)
      .order("name"),
    // activity enum values derived from the rendszerterv — static list
    Promise.resolve({ data: null }),
  ]);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
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
