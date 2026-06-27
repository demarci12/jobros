import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { RequestForm } from "@/components/public/RequestForm";

export const dynamic = "force-dynamic";

export default async function PublicRequestPage({ params }: { params: { slug: string } }) {
  const service = createServiceClient();

  const { data: company } = await service
    .from("companies")
    .select("id, name, public_slug")
    .eq("public_slug", params.slug)
    .maybeSingle();

  if (!company) notFound();

  const { data: services } = await service
    .from("services")
    .select("id, name")
    .eq("company_id", company.id)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="text-muted-foreground text-sm">Ajánlatkérő űrlap</p>
        </div>
        <RequestForm companySlug={params.slug} services={(services ?? []) as any} />
      </div>
    </div>
  );
}
