import { createBrowserClient } from "@supabase/ssr";

// Literal access required — Next.js only inlines process.env.NEXT_PUBLIC_* at build time,
// dynamic process.env[name] is undefined in the client bundle.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
