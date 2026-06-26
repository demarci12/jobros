// CSAK szerver oldali fájlokból importálható — service_role kulcs, sosem kerül a kliens bundle-be.
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./env";

export function createServiceClient() {
  return createSupabaseClient(
    SUPABASE_URL(),
    SUPABASE_SERVICE_ROLE_KEY(),
    { auth: { persistSession: false } }
  );
}
