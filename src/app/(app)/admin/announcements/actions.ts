"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fstr } from "@/lib/utils";

export async function saveAnnouncement(fd: FormData) {
  const me = await requireAdmin();
  const title = fstr(fd, "title");
  if (!title) redirect("/admin/announcements?error=" + encodeURIComponent("Title is required"));
  const endsOn = fstr(fd, "ends_on");
  await createAdminClient().from("announcements").insert({
    title,
    body_md: fstr(fd, "body_md"),
    department_id: fstr(fd, "department_id") || null,
    pinned: fd.get("pinned") === "on",
    ends_at: endsOn ? new Date(`${endsOn}T23:59:59`).toISOString() : null,
    created_by: me.id,
  });
  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  redirect("/admin/announcements?saved=1");
}

export async function deleteAnnouncement(fd: FormData) {
  await requireAdmin();
  await createAdminClient().from("announcements").delete().eq("id", fstr(fd, "id"));
  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}
