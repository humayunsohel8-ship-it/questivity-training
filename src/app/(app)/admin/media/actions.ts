"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteMedia(path: string) {
  await requireAdmin();
  if (!path.startsWith("library/") || path.includes("..")) throw new Error("Invalid path");
  await createAdminClient().storage.from("course-media").remove([path]);
  revalidatePath("/admin/media");
}
