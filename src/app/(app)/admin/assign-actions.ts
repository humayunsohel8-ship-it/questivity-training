"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fstr } from "@/lib/utils";

async function back(qs: string): Promise<never> {
  const referer = (await headers()).get("referer");
  let path = "/admin";
  try {
    if (referer) path = new URL(referer).pathname;
  } catch {
    /* default */
  }
  redirect(`${path}?${qs}`);
}

/**
 * Assign one course to a person, a department, or everyone, with an optional due date.
 * Existing enrolments keep their progress; the earlier due date wins.
 */
export async function assignCourse(fd: FormData) {
  const me = await requireAdmin();
  const db = createAdminClient();
  const courseId = fstr(fd, "course_id");
  const target = fstr(fd, "target");
  const due = fstr(fd, "due") || null;
  if (!courseId) return back("error=" + encodeURIComponent("Choose a course"));

  let q = db.from("profiles").select("id").eq("is_active", true);
  if (target === "user") q = q.eq("id", fstr(fd, "user_id"));
  else if (target === "department") q = q.eq("department_id", fstr(fd, "department_id"));
  else if (target === "emails") {
    const emails = fstr(fd, "emails").toLowerCase().split(/[\s,;]+/).filter((e) => e.includes("@"));
    if (!emails.length) return back("error=" + encodeURIComponent("Enter at least one email"));
    q = q.in("email", emails);
  }
  const { data: people } = await q;
  if (!people?.length) return back("error=" + encodeURIComponent("No matching active users"));

  const { data: existing } = await db.from("enrollments").select("user_id, due_date").eq("course_id", courseId).in("user_id", people.map((p) => p.id));
  const existingMap = new Map((existing ?? []).map((e) => [e.user_id as string, e.due_date as string | null]));

  const fresh = people.filter((p) => !existingMap.has(p.id)).map((p) => ({ user_id: p.id, course_id: courseId, assigned_by: me.id, due_date: due }));
  if (fresh.length) await db.from("enrollments").insert(fresh);
  if (due) {
    for (const [userId, current] of existingMap) {
      if (!current || current > due) await db.from("enrollments").update({ due_date: due }).eq("course_id", courseId).eq("user_id", userId);
    }
  }

  revalidatePath("/admin", "layout");
  return back("saved=1&note=" + encodeURIComponent(`Assigned to ${people.length} ${people.length === 1 ? "person" : "people"} (${fresh.length} new).`));
}

export async function removeEnrollment(fd: FormData) {
  await requireAdmin();
  await createAdminClient().from("enrollments").delete().eq("id", fstr(fd, "id"));
  revalidatePath(`/admin/learners/${fstr(fd, "user_id")}`);
  return back("saved=1");
}
