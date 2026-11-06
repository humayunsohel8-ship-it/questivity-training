import type { SupabaseClient } from "@supabase/supabase-js";
import type { Course, Enrollment } from "@/lib/types";

export type EnrollmentWithCourse = Enrollment & {
  course: Pick<Course, "id" | "slug" | "title" | "summary" | "category" | "level" | "duration_minutes" | "is_mandatory">;
  progress: number; // 0–100
  done: number;
  total: number;
};

/** Lesson completion counts for a user across the given courses. */
export async function progressFor(supabase: SupabaseClient, userId: string, courseIds: string[]) {
  const totals = new Map<string, number>();
  const done = new Map<string, number>();
  if (courseIds.length === 0) return { totals, done };

  const [{ data: lessons }, { data: progress }] = await Promise.all([
    supabase.from("lessons").select("id, course_id").in("course_id", courseIds),
    supabase.from("lesson_progress").select("course_id").eq("user_id", userId).in("course_id", courseIds),
  ]);
  for (const l of lessons ?? []) totals.set(l.course_id, (totals.get(l.course_id) ?? 0) + 1);
  for (const p of progress ?? []) done.set(p.course_id, (done.get(p.course_id) ?? 0) + 1);
  return { totals, done };
}

export async function getEnrollments(supabase: SupabaseClient, userId: string): Promise<EnrollmentWithCourse[]> {
  const { data } = await supabase
    .from("enrollments")
    .select("*, course:courses(id, slug, title, summary, category, level, duration_minutes, is_mandatory)")
    .eq("user_id", userId)
    .order("due_date", { ascending: true, nullsFirst: false });

  const rows = ((data ?? []) as (Enrollment & { course: EnrollmentWithCourse["course"] | null })[]).filter(
    (r): r is Enrollment & { course: EnrollmentWithCourse["course"] } => r.course !== null,
  );
  const { totals, done } = await progressFor(supabase, userId, rows.map((r) => r.course_id));

  return rows.map((r) => {
    const total = totals.get(r.course_id) ?? 0;
    const d = done.get(r.course_id) ?? 0;
    return { ...r, total, done: d, progress: r.status === "completed" ? 100 : total ? (100 * d) / total : 0 };
  });
}
