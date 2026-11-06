"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { QuizResult } from "@/lib/types";

export async function enrollAction(courseId: string, slug: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("enroll_self", { p_course: courseId });
  if (error) throw new Error("Could not enrol in this course.");
  revalidatePath(`/courses/${slug}`);
  revalidatePath("/dashboard");
}

export async function completeLessonAction(lessonId: string, slug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("lesson_progress")
    .upsert({ user_id: user.id, lesson_id: lessonId }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true });
  if (error) throw new Error("Could not save your progress.");
  revalidatePath(`/courses/${slug}`, "layout");
  revalidatePath("/dashboard");
}

export async function submitQuizAction(lessonId: string, slug: string, answers: (number | null)[]): Promise<QuizResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_quiz", { p_lesson: lessonId, p_answers: answers });
  if (error || !data) throw new Error("Could not submit the quiz.");
  revalidatePath(`/courses/${slug}`, "layout");
  revalidatePath("/dashboard");
  return data as QuizResult;
}
