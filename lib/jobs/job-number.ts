import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Generates a sequential job number in the format `YYYY-NNNN` (e.g. `2026-0001`).
 * The sequence resets each calendar year and is scoped to the given company.
 */
export async function generateJobNumber(
  supabase: SupabaseClient,
  companyId: string,
): Promise<string> {
  const year = new Date().getFullYear().toString();
  const { count } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .like("job_number", `${year}-%`);
  const seq = ((count ?? 0) + 1).toString().padStart(4, "0");
  return `${year}-${seq}`;
}
