"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client (used for direct uploads to storage from admin screens). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
