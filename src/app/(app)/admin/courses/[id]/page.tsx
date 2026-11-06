import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { LessonIcon } from "@/components/lesson-icon";
import { ConfirmButton } from "@/components/confirm-button";
import { createLesson, deleteCourse, deleteModule, saveModule, updateCourse } from "../../actions";
import { minutesLabel } from "@/lib/utils";
import type { Course, CourseModule, Lesson } from "@/lib/types";

export const metadata = { title: "Admin · Edit course" };

export default async function AdminCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: course }, { data: modules }, { data: lessons }] = await Promise.all([
    db.from("courses").select("*").eq("id", id).maybeSingle(),
    db.from("course_modules").select("*").eq("course_id", id).order("position"),
    db.from("lessons").select("id, module_id, title, kind, position, duration_minutes").eq("course_id", id).order("position"),
  ]);
  if (!course) notFound();
  const c = course as Course;
  const mods = (modules ?? []) as CourseModule[];
  const ls = (lessons ?? []) as Pick<Lesson, "id" | "module_id" | "title" | "kind" | "position" | "duration_minutes">[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/courses" className="text-sm text-brand hover:underline">← Courses</Link>
          <h1 className="page-title mt-1">{c.title}</h1>
        </div>
        <Link href={`/courses/${c.slug}`} className="btn-ghost" target="_blank"><ExternalLink className="h-4 w-4" /> Preview</Link>
      </div>

      <form action={updateCourse} className="card grid gap-4 p-6 sm:grid-cols-2">
        <input type="hidden" name="id" value={c.id} />
        <div className="sm:col-span-2"><label className="label">Title</label><input name="title" defaultValue={c.title} className="input" required /></div>
        <div><label className="label">URL slug</label><input name="slug" defaultValue={c.slug} className="input" required /></div>
        <div><label className="label">Category</label><input name="category" defaultValue={c.category} className="input" /></div>
        <div>
          <label className="label">Level</label>
          <select name="level" defaultValue={c.level} className="input"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select>
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={c.status} className="input"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select>
        </div>
        <div className="sm:col-span-2"><label className="label">Summary (shown on cards)</label><input name="summary" defaultValue={c.summary} className="input" /></div>
        <div className="sm:col-span-2"><label className="label">Description (markdown)</label><textarea name="description_md" defaultValue={c.description_md} rows={5} className="input font-mono" /></div>
        <div><label className="label">Duration (minutes, auto-summed from lessons)</label><input name="duration_minutes" type="number" min={0} defaultValue={c.duration_minutes} className="input" /></div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="is_mandatory" defaultChecked={c.is_mandatory} /> Mandatory for all employees</label>
        <div className="sm:col-span-2"><button className="btn-primary">Save course</button></div>
      </form>

      <section className="space-y-4">
        <h2 className="section-title">Modules & lessons</h2>
        {mods.map((m) => (
          <div key={m.id} className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-brand-line bg-brand-surface p-3">
              <form action={saveModule} className="flex flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="course_id" value={c.id} />
                <input name="position" type="number" defaultValue={m.position} className="input w-16 py-1.5" title="Order" />
                <input name="title" defaultValue={m.title} className="input flex-1 py-1.5 font-semibold" />
                <button className="btn-ghost py-1.5">Save</button>
              </form>
              <form action={deleteModule}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="course_id" value={c.id} />
                <ConfirmButton message="Delete this module and all its lessons?" className="btn-ghost py-1.5 text-red-600"><Trash2 className="h-4 w-4" /></ConfirmButton>
              </form>
            </div>
            <ul className="divide-y divide-brand-line">
              {ls.filter((l) => l.module_id === m.id).map((l) => (
                <li key={l.id}>
                  <Link href={`/admin/courses/${c.id}/lessons/${l.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-brand-light/40">
                    <span className="w-6 text-xs text-brand-muted">{l.position}</span>
                    <LessonIcon kind={l.kind} />
                    <span className="flex-1">{l.title}</span>
                    <span className="text-xs uppercase text-brand-muted">{l.kind}</span>
                    <span className="w-16 text-right text-xs text-brand-muted">{minutesLabel(l.duration_minutes)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <form action={createLesson} className="flex flex-wrap items-center gap-2 border-t border-brand-line p-3">
              <input type="hidden" name="course_id" value={c.id} />
              <input type="hidden" name="module_id" value={m.id} />
              <input name="title" placeholder="New lesson title" className="input flex-1 py-1.5" required />
              <select name="kind" className="input w-auto py-1.5">
                <option value="article">Article</option><option value="video">Video</option><option value="pdf">PDF / document</option><option value="quiz">Quiz</option>
              </select>
              <button className="btn-primary py-1.5">Add lesson</button>
            </form>
          </div>
        ))}
        <form action={saveModule} className="flex gap-2">
          <input type="hidden" name="course_id" value={c.id} />
          <input type="hidden" name="position" value={mods.length + 1} />
          <input name="title" placeholder="New module title" className="input flex-1" required />
          <button className="btn-ghost">Add module</button>
        </form>
      </section>

      <form action={deleteCourse} className="border-t border-brand-line pt-6">
        <input type="hidden" name="id" value={c.id} />
        <ConfirmButton message="Permanently delete this course, its lessons and all learner progress? Consider archiving instead.">
          <Trash2 className="h-4 w-4" /> Delete course
        </ConfirmButton>
      </form>
    </div>
  );
}
