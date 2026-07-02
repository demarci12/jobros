import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { KpiCards, TodayAppointments, UnbilledJobs, OutstandingAndServices } from "./dashboard-sections";
import { Skeleton } from "@/components/ui/skeleton";

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <Skeleton className="h-4 w-32" />
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
    </div>
  );
}

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-xl font-semibold">Irányítópult</h1>
      </div>

      <Suspense fallback={<KpiSkeleton />}>
        <KpiCards />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Suspense fallback={<CardSkeleton />}>
          <TodayAppointments />
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          <UnbilledJobs />
        </Suspense>

        <Suspense fallback={null}>
          <OutstandingAndServices />
        </Suspense>
      </div>
    </div>
  );
}
