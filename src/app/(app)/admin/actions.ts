"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fint, fstr, slugify } from "@/lib/utils";

const STATUSES = ["draft", "published", "archived"] as const;
const KINDS = ["article", "video", "pdf", "quiz"] as const;
const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

function pick<T extends readonly string[]>(value: string, allowed: T, fallback: T[number]): T[number] {
  return (allowed as readonly string[]).includes(value) ? (value as T[number]) : fallback;
}

/** Send the admin back to the page they submitted from, with the error shown in a banner. */
async function fail(message: string): Promise<never> {
  const referer = (await headers()).get("referer");
  let path = "/admin";
  try {
    if (referer) path = new URL(referer).pathname;
  } catch {
    /* keep default */
  }
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

// ─── Courses ────────────────────────────────────────────────────────
export async function createCourse(fd: FormData) {
  const me = await requireAdmin();
  const title = fstr(fd, "title");
  if (!title) return fail("Title is required");
  const db = createAdminClient();
  const { data, error } = await db
    .from("courses")
    .insert({
      title,
      slug: slugify(fstr(fd, "slug") || title),
      summary: fstr(fd, "summary"),
      category: fstr(fd, "category") || "General",
      level: pick(fstr(fd, "level"), LEVELS, "Beginner"),
      created_by: me.id,
    })
    .select("id")
    .single();
  if (error) return fail(error.code === "23505" ? "A course with that slug already exists" : error.message);
  await db.from("course_modules").insert({ course_id: data.id, title: "Module 1", position: 1 });
  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${data.id}`);
}

export async function updateCourse(fd: FormData) {
  await requireAdmin();
  const id = fstr(fd, "id");
  const db = createAdminClient();
  const { error } = await db
    .from("courses")
    .update({
      title: fstr(fd, "title"),
      slug: slugify(fstr(fd, "slug")),
      summary: fstr(fd, "summary"),
      description_md: fstr(fd, "description_md"),
      category: fstr(fd, "category") || "General",
      level: pick(fstr(fd, "level"), LEVELS, "Beginner"),
      duration_minutes: fint(fd, "duration_minutes"),
      is_mandatory: fd.get("is_mandatory") === "on",
      status: pick(fstr(fd, "status"), STATUSES, "draft"),
    })
    .eq("id", id);
  if (error) return fail(error.code === "23505" ? "A course with that slug already exists" : error.message);
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${id}`);
  revalidatePath("/courses", "layout");
}

export async function deleteCourse(fd: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  await db.from("courses").delete().eq("id", fstr(fd, "id"));
  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}

export async function saveModule(fd: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const id = fstr(fd, "id");
  const courseId = fstr(fd, "course_id");
  const values = { title: fstr(fd, "title") || "Untitled module", position: fint(fd, "position", 1) };
  if (id) await db.from("course_modules").update(values).eq("id", id);
  else await db.from("course_modules").insert({ ...values, course_id: courseId });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function deleteModule(fd: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  await db.from("course_modules").delete().eq("id", fstr(fd, "id"));
  revalidatePath(`/admin/courses/${fstr(fd, "course_id")}`);
}

export async function createLesson(fd: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const courseId = fstr(fd, "course_id");
  const moduleId = fstr(fd, "module_id");
  const { count } = await db.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId);
  const { data, error } = await db
    .from("lessons")
    .insert({
      course_id: courseId,
      module_id: moduleId,
      title: fstr(fd, "title") || "New lesson",
      kind: pick(fstr(fd, "kind"), KINDS, "article"),
      position: (count ?? 0) + 1,
    })
    .select("id")
    .single();
  if (error) return fail(error.message);
  await recalcCourseDuration(courseId);
  redirect(`/admin/courses/${courseId}/lessons/${data.id}`);
}

export async function updateLesson(fd: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const id = fstr(fd, "id");
  const courseId = fstr(fd, "course_id");
  const { error } = await db
    .from("lessons")
    .update({
      title: fstr(fd, "title"),
      kind: pick(fstr(fd, "kind"), KINDS, "article"),
      module_id: fstr(fd, "module_id"),
      position: fint(fd, "position", 1),
      duration_minutes: fint(fd, "duration_minutes", 5),
      media_url: fstr(fd, "media_url") || null,
      body_md: fstr(fd, "body_md"),
    })
    .eq("id", id);
  if (error) return fail(error.message);
  await recalcCourseDuration(courseId);
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}/lessons/${id}`);
  revalidatePath("/courses", "layout");
}

export async function deleteLesson(fd: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const courseId = fstr(fd, "course_id");
  await db.from("lessons").delete().eq("id", fstr(fd, "id"));
  await recalcCourseDuration(courseId);
  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}`);
}

async function recalcCourseDuration(courseId: string) {
  const db = createAdminClient();
  const { data } = await db.from("lessons").select("duration_minutes").eq("course_id", courseId);
  const total = (data ?? []).reduce((s, l) => s + (l.duration_minutes ?? 0), 0);
  await db.from("courses").update({ duration_minutes: total }).eq("id", courseId);
}

// ─── Quiz questions ─────────────────────────────────────────────────
export async function saveQuestion(fd: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const id = fstr(fd, "id");
  const lessonId = fstr(fd, "lesson_id");
  const courseId = fstr(fd, "course_id");
  const options = fstr(fd, "options")
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, 6);
  if (options.length < 2) return fail("Enter at least two options, one per line");
  const correct = Math.min(Math.max(fint(fd, "correct_index", 1) - 1, 0), options.length - 1);
  const values = {
    prompt: fstr(fd, "prompt"),
    options,
    correct_index: correct,
    explanation: fstr(fd, "explanation"),
    position: fint(fd, "position", 1),
  };
  if (!values.prompt) return fail("Question text is required");
  const { error } = id
    ? await db.from("quiz_questions").update(values).eq("id", id)
    : await db.from("quiz_questions").insert({ ...values, lesson_id: lessonId });
  if (error) return fail(error.message);
  revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
}

export async function deleteQuestion(fd: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  await db.from("quiz_questions").delete().eq("id", fstr(fd, "id"));
  revalidatePath(`/admin/courses/${fstr(fd, "course_id")}/lessons/${fstr(fd, "lesson_id")}`);
}

// ─── Learning paths ─────────────────────────────────────────────────
export async function savePath(fd: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const id = fstr(fd, "id");
  const title = fstr(fd, "title");
  if (!title) return fail("Title is required");
  const values = {
    title,
    slug: slugify(fstr(fd, "slug") || title),
    description: fstr(fd, "description"),
    audience: fstr(fd, "audience") || "All employees",
    is_onboarding: fd.get("is_onboarding") === "on",
    default_due_days: fint(fd, "default_due_days", 30),
    status: pick(fstr(fd, "status"), STATUSES, "draft"),
  };
  if (id) {
    const { error } = await db.from("learning_paths").update(values).eq("id", id);
    if (error) return fail(error.message);
    revalidatePath(`/admin/paths/${id}`);
  } else {
    const { data, error } = await db.from("learning_paths").insert(values).select("id").single();
    if (error) return fail(error.code === "23505" ? "A path with that slug already exists" : error.message);
    redirect(`/admin/paths/${data.id}`);
  }
  revalidatePath("/admin/paths");
  revalidatePath("/paths");
}

export async function deletePath(fd: FormData) {
  await requireAdmin();
  await createAdminClient().from("learning_paths").delete().eq("id", fstr(fd, "id"));
  revalidatePath("/admin/paths");
  redirect("/admin/paths");
}

export async function addPathCourse(fd: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const pathId = fstr(fd, "path_id");
  const { count } = await db.from("learning_path_courses").select("course_id", { count: "exact", head: true }).eq("path_id", pathId);
  await db.from("learning_path_courses").upsert({ path_id: pathId, course_id: fstr(fd, "course_id"), position: (count ?? 0) + 1 });
  revalidatePath(`/admin/paths/${pathId}`);
}

export async function updatePathCourse(fd: FormData) {
  await requireAdmin();
  const pathId = fstr(fd, "path_id");
  await createAdminClient()
    .from("learning_path_courses")
    .update({ position: fint(fd, "position", 1) })
    .eq("path_id", pathId)
    .eq("course_id", fstr(fd, "course_id"));
  revalidatePath(`/admin/paths/${pathId}`);
}

export async function removePathCourse(fd: FormData) {
  await requireAdmin();
  const pathId = fstr(fd, "path_id");
  await createAdminClient().from("learning_path_courses").delete().eq("path_id", pathId).eq("course_id", fstr(fd, "course_id"));
  revalidatePath(`/admin/paths/${pathId}`);
}

/** Assign a path to every active member of a department. */
export async function assignPathToDepartment(fd: FormData) {
  const me = await requireAdmin();
  const db = createAdminClient();
  const pathId = fstr(fd, "path_id");
  const dept = fstr(fd, "department_id");
  const due = fstr(fd, "due") || null;
  let q = db.from("profiles").select("id").eq("is_active", true);
  if (dept !== "all") q = q.eq("department_id", dept);
  const { data: people } = await q;
  for (const p of people ?? []) {
    await db.rpc("assign_path_to_user", { p_path: pathId, p_user: p.id, p_due: due, p_assigned_by: me.id });
  }
  revalidatePath(`/admin/paths/${pathId}`);
  revalidatePath("/admin");
}

// ─── Knowledge base ─────────────────────────────────────────────────
export async function saveArticle(fd: FormData) {
  const me = await requireAdmin();
  const db = createAdminClient();
  const id = fstr(fd, "id");
  const title = fstr(fd, "title");
  if (!title) return fail("Title is required");
  const values = {
    title,
    slug: slugify(fstr(fd, "slug") || title),
    summary: fstr(fd, "summary"),
    body_md: fstr(fd, "body_md"),
    category_id: fstr(fd, "category_id") || null,
    tags: fstr(fd, "tags").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
    status: pick(fstr(fd, "status"), STATUSES, "draft"),
    owner_team: fstr(fd, "owner_team") || null,
    review_due: fstr(fd, "review_due") || null,
  };
  let articleId = id;
  if (id) {
    const { error } = await db.from("kb_articles").update(values).eq("id", id);
    if (error) return fail(error.code === "23505" ? "An article with that slug already exists" : error.message);
  } else {
    const { data, error } = await db.from("kb_articles").insert({ ...values, author_id: me.id }).select("id").single();
    if (error) return fail(error.code === "23505" ? "An article with that slug already exists" : error.message);
    articleId = data.id;
  }
  revalidatePath("/admin/kb");
  revalidatePath("/kb", "layout");
  redirect(`/admin/kb/${articleId}?saved=1`);
}

export async function deleteArticle(fd: FormData) {
  await requireAdmin();
  await createAdminClient().from("kb_articles").delete().eq("id", fstr(fd, "id"));
  revalidatePath("/admin/kb");
  revalidatePath("/kb", "layout");
  redirect("/admin/kb");
}

export async function saveCategory(fd: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const id = fstr(fd, "id");
  const name = fstr(fd, "name");
  if (!name) return fail("Name is required");
  const values = { name, slug: slugify(name), description: fstr(fd, "description"), position: fint(fd, "position", 0) };
  if (id) await db.from("kb_categories").update(values).eq("id", id);
  else await db.from("kb_categories").insert(values);
  revalidatePath("/admin/kb");
  revalidatePath("/kb");
}

// ─── Users & settings ───────────────────────────────────────────────
export async function updateUser(fd: FormData) {
  const me = await requireAdmin();
  const db = createAdminClient();
  const id = fstr(fd, "id");
  const role = pick(fstr(fd, "role"), ["learner", "manager", "admin"] as const, "learner");
  const isActive = fd.get("is_active") === "on";
  if (id === me.id && (role !== "admin" || !isActive)) return fail("You can't remove your own admin access");
  const managerId = fstr(fd, "manager_id") || null;
  const { error } = await db
    .from("profiles")
    .update({
      full_name: fstr(fd, "full_name") || null,
      job_title: fstr(fd, "job_title") || null,
      role,
      department_id: fstr(fd, "department_id") || null,
      manager_id: managerId === id ? null : managerId,
      is_active: isActive,
    })
    .eq("id", id);
  if (error) return fail(error.message);
  // Deactivated users are banned at the auth layer (blocks sign-in and token refresh); reactivation lifts it.
  await db.auth.admin.updateUserById(id, { ban_duration: isActive ? "none" : "876000h" });
  revalidatePath("/admin/users");
}

export async function inviteUser(fd: FormData) {
  await requireAdmin();
  const email = fstr(fd, "email").toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email");
  const db = createAdminClient();
  const { error } = await db.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fstr(fd, "full_name") },
    redirectTo: `${(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")}/auth/callback`,
  });
  if (error) return fail(error.message.includes("restricted") ? "That email domain isn't allowed (Admin → Settings)." : error.message);
  revalidatePath("/admin/users");
}

const MIN_PASSWORD = 10;

/** Create a sign-in account with a temporary password (no email needed). */
export async function createUserWithPassword(fd: FormData) {
  await requireAdmin();
  const email = fstr(fd, "email").toLowerCase();
  const password = String(fd.get("password") || "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email");
  if (password.length < MIN_PASSWORD) return fail(`Temporary password must be at least ${MIN_PASSWORD} characters`);

  const db = createAdminClient();
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fstr(fd, "full_name") },
  });
  if (error || !data.user) {
    const msg = error?.message ?? "Could not create the user";
    if (/already been registered|already exists/i.test(msg)) return fail("A user with that email already exists — use Reset password instead.");
    if (/restricted|Database error/i.test(msg)) return fail("That email domain isn't allowed (Admin → Settings → allowed domains).");
    return fail(msg);
  }

  await db
    .from("profiles")
    .update({
      full_name: fstr(fd, "full_name") || null,
      role: pick(fstr(fd, "role"), ["learner", "manager", "admin"] as const, "learner"),
      department_id: fstr(fd, "department_id") || null,
      must_change_password: true,
    })
    .eq("id", data.user.id);

  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}

/** Set a new temporary password for a user; they must change it at next sign-in. */
export async function resetUserPassword(fd: FormData) {
  const me = await requireAdmin();
  const id = fstr(fd, "id");
  const password = String(fd.get("password") || "");
  if (password.length < MIN_PASSWORD) return fail(`Temporary password must be at least ${MIN_PASSWORD} characters`);

  const db = createAdminClient();
  const { error } = await db.auth.admin.updateUserById(id, { password });
  if (error) return fail(error.message);
  if (id !== me.id) await db.from("profiles").update({ must_change_password: true }).eq("id", id);
  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}

export async function saveSettings(fd: FormData) {
  await requireAdmin();
  const domains = fstr(fd, "allowed_email_domains")
    .split(/[\s,]+/)
    .map((d) => d.replace(/^@/, "").toLowerCase())
    .filter(Boolean);
  const { error } = await createAdminClient()
    .from("org_settings")
    .update({
      allowed_email_domains: domains,
      quiz_pass_mark: Math.min(100, Math.max(0, fint(fd, "quiz_pass_mark", 70))),
      ai_assistant_enabled: fd.get("ai_assistant_enabled") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) return fail(error.message);
  revalidatePath("/admin/settings");
}

export async function saveDepartment(fd: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const id = fstr(fd, "id");
  const name = fstr(fd, "name");
  if (!name) return fail("Name is required");
  if (id) await db.from("departments").update({ name }).eq("id", id);
  else await db.from("departments").insert({ name });
  revalidatePath("/admin/settings");
}

export async function deleteDepartment(fd: FormData) {
  await requireAdmin();
  await createAdminClient().from("departments").delete().eq("id", fstr(fd, "id"));
  revalidatePath("/admin/settings");
}
