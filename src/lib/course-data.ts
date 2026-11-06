import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Course, CourseModule, Lesson } from "@/lib/types";

export type CourseOutline = {
  course: Course;
  modules: (CourseModule & { lessons: Lesson[] })[];
  lessons: Lesson[]; // flattened, in order
  completed: Set<string>;
};

export async function loadCourseOutline(supabase: SupabaseClient, slug: string, userId: string): Promise<CourseOutline> {
  const { data: course } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
  if (!course) notFound();

  const [{ data: modules }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase.from("course_modules").select("*").eq("course_id", course.id).order("position"),
    supabase.from("lessons").select("*").eq("course_id", course.id).order("position"),
    supabase.from("lesson_progress").select("lesson_id").eq("course_id", course.id).eq("user_id", userId),
  ]);

  const mods = ((modules ?? []) as CourseModule[]).map((m) => ({
    ...m,
    lessons: ((lessons ?? []) as Lesson[]).filter((l) => l.module_id === m.id),
  }));
  return {
    course: course as Course,
    modules: mods,
    lessons: mods.flatMap((m) => m.lessons),
    completed: new Set((progress ?? []).map((p) => p.lesson_id as string)),
  };
}
