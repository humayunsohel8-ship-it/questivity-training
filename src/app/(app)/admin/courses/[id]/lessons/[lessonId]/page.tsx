import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConfirmButton } from "@/components/confirm-button";
import { MediaField } from "./media-field";
import { deleteLesson, deleteQuestion, saveQuestion, updateLesson } from "../../../../actions";
import type { Lesson } from "@/lib/types";

export const metadata = { title: "Admin · Edit lesson" };

type Question = { id: string; prompt: string; options: string[]; correct_index: number; explanation: string; position: number };

export default async function AdminLessonPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id: courseId, lessonId } = await params;
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: lesson }, { data: modules }, { data: course }, { data: questions }] = await Promise.all([
    db.from("lessons").select("*").eq("id", lessonId).eq("course_id", courseId).maybeSingle(),
    db.from("course_modules").select("id, title, position").eq("course_id", courseId).order("position"),
    db.from("courses").select("title, slug").eq("id", courseId).maybeSingle(),
    db.from("quiz_questions").select("*").eq("lesson_id", lessonId).order("position").order("id"),
  ]);
  if (!lesson || !course) notFound();
  const l = lesson as Lesson;
  const qs = (questions ?? []) as Question[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/admin/courses/${courseId}`} className="text-sm text-brand hover:underline">← {course.title}</Link>
          <h1 className="page-title mt-1">{l.title}</h1>
        </div>
        <Link href={`/courses/${course.slug}/lessons/${l.id}`} target="_blank" className="btn-ghost"><ExternalLink className="h-4 w-4" /> Preview</Link>
      </div>

      <form action={updateLesson} className="card grid gap-4 p-6 sm:grid-cols-4">
        <input type="hidden" name="id" value={l.id} />
        <input type="hidden" name="course_id" value={courseId} />
        <div className="sm:col-span-4"><label className="label">Title</label><input name="title" defaultValue={l.title} className="input" required /></div>
        <div>
          <label className="label">Type</label>
          <select name="kind" defaultValue={l.kind} className="input">
            <option value="article">Article</option><option value="video">Video</option><option value="pdf">PDF / document</option><option value="quiz">Quiz</option>
          </select>
        </div>
        <div>
          <label className="label">Module</label>
          <select name="module_id" defaultValue={l.module_id} className="input">
            {(modules ?? []).map((m) => <option key={m.id} value={m.id}>{m.position}. {m.title}</option>)}
          </select>
        </div>
        <div><label className="label">Order</label><input name="position" type="number" defaultValue={l.position} className="input" /></div>
        <div><label className="label">Minutes</label><input name="duration_minutes" type="number" min={0} defaultValue={l.duration_minutes} className="input" /></div>
        <div className="sm:col-span-4">
          <MediaField name="media_url" defaultValue={l.media_url ?? ""} courseId={courseId} />
        </div>
        <div className="sm:col-span-4">
          <label className="label">{l.kind === "quiz" ? "Instructions (markdown)" : "Content (markdown)"}</label>
          <textarea name="body_md" defaultValue={l.body_md} rows={18} className="input font-mono text-[13px] leading-relaxed" />
          <p className="mt-1 text-xs text-brand-muted">Markdown: ## headings, **bold**, lists, tables, ```code blocks```, [links](https://…).</p>
        </div>
        <div className="sm:col-span-4"><button className="btn-primary">Save lesson</button></div>
      </form>

      {l.kind === "quiz" && (
        <section className="space-y-4">
          <div>
            <h2 className="section-title">Quiz questions</h2>
            <p className="text-sm text-brand-muted">Learners never receive the correct answers — grading happens in the database. Pass mark is set in Settings.</p>
          </div>
          {[...qs, null].map((q, i) => (
            <form key={q?.id ?? "new"} action={saveQuestion} className="card grid gap-3 p-5 sm:grid-cols-6">
              <input type="hidden" name="id" value={q?.id ?? ""} />
              <input type="hidden" name="lesson_id" value={l.id} />
              <input type="hidden" name="course_id" value={courseId} />
              <p className="text-sm font-semibold sm:col-span-6">{q ? `Question ${i + 1}` : "Add a question"}</p>
              <div className="sm:col-span-5"><label className="label">Question</label><input name="prompt" defaultValue={q?.prompt} className="input" required /></div>
              <div><label className="label">Order</label><input name="position" type="number" defaultValue={q?.position ?? qs.length + 1} className="input" /></div>
              <div className="sm:col-span-4">
                <label className="label">Options (one per line, 2–6)</label>
                <textarea name="options" rows={4} defaultValue={q?.options.join("\n")} className="input" required />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Correct option #</label>
                <input name="correct_index" type="number" min={1} max={6} defaultValue={q ? q.correct_index + 1 : 1} className="input" />
              </div>
              <div className="sm:col-span-6"><label className="label">Explanation (shown after answering)</label><input name="explanation" defaultValue={q?.explanation} className="input" /></div>
              <div className="flex gap-2 sm:col-span-6">
                <button className="btn-primary py-1.5">{q ? "Save question" : "Add question"}</button>
                {q && (
                  <button formAction={deleteQuestion} className="btn-ghost py-1.5 text-red-600"><Trash2 className="h-4 w-4" /> Delete</button>
                )}
              </div>
            </form>
          ))}
        </section>
      )}

      <form action={deleteLesson} className="border-t border-brand-line pt-6">
        <input type="hidden" name="id" value={l.id} />
        <input type="hidden" name="course_id" value={courseId} />
        <ConfirmButton message="Delete this lesson and learners' progress on it?"><Trash2 className="h-4 w-4" /> Delete lesson</ConfirmButton>
      </form>
    </div>
  );
}
