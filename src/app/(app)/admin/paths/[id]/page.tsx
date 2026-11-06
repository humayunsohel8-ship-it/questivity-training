import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConfirmButton } from "@/components/confirm-button";
import { addPathCourse, assignPathToDepartment, deletePath, removePathCourse, savePath, updatePathCourse } from "../../actions";

export const metadata = { title: "Admin · Edit learning path" };

export default async function AdminPathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: path }, { data: items }, { data: courses }, { data: departments }] = await Promise.all([
    db.from("learning_paths").select("*").eq("id", id).maybeSingle(),
    db.from("learning_path_courses").select("course_id, position, course:courses(title, status)").eq("path_id", id).order("position"),
    db.from("courses").select("id, title, status").neq("status", "archived").order("title"),
    db.from("departments").select("id, name").order("name"),
  ]);
  if (!path) notFound();
  const rows = (items ?? []) as unknown as { course_id: string; position: number; course: { title: string; status: string } | null }[];
  const inPath = new Set(rows.map((r) => r.course_id));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/paths" className="text-sm text-brand hover:underline">← Learning paths</Link>
        <h1 className="page-title mt-1">{path.title}</h1>
      </div>

      <form action={savePath} className="card grid gap-4 p-6 sm:grid-cols-2">
        <input type="hidden" name="id" value={path.id} />
        <div><label className="label">Title</label><input name="title" defaultValue={path.title} className="input" required /></div>
        <div><label className="label">URL slug</label><input name="slug" defaultValue={path.slug} className="input" /></div>
        <div className="sm:col-span-2"><label className="label">Description</label><textarea name="description" defaultValue={path.description} rows={2} className="input" /></div>
        <div><label className="label">Audience</label><input name="audience" defaultValue={path.audience} className="input" /></div>
        <div><label className="label">Default due (days)</label><input name="default_due_days" type="number" defaultValue={path.default_due_days} className="input" /></div>
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={path.status} className="input"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="is_onboarding" defaultChecked={path.is_onboarding} /> Auto-assign to new joiners</label>
        <div className="sm:col-span-2"><button className="btn-primary">Save path</button></div>
      </form>

      <section className="card overflow-hidden">
        <div className="border-b border-brand-line px-5 py-4"><h2 className="section-title">Courses in this path</h2></div>
        <ul className="divide-y divide-brand-line">
          {rows.map((r) => (
            <li key={r.course_id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <form action={updatePathCourse} className="flex items-center gap-2">
                <input type="hidden" name="path_id" value={path.id} />
                <input type="hidden" name="course_id" value={r.course_id} />
                <input name="position" type="number" defaultValue={r.position} className="input w-16 py-1" />
                <button className="text-xs text-brand hover:underline">Set order</button>
              </form>
              <span className="flex-1 font-medium">{r.course?.title}{r.course?.status !== "published" && <span className="ml-2 text-xs text-amber-600">({r.course?.status} — hidden from learners)</span>}</span>
              <form action={removePathCourse}>
                <input type="hidden" name="path_id" value={path.id} />
                <input type="hidden" name="course_id" value={r.course_id} />
                <button className="text-red-600 hover:underline"><Trash2 className="h-4 w-4" /></button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addPathCourse} className="flex gap-2 border-t border-brand-line p-4">
          <input type="hidden" name="path_id" value={path.id} />
          <select name="course_id" className="input flex-1" required defaultValue="">
            <option value="" disabled>Add a course…</option>
            {(courses ?? []).filter((c) => !inPath.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}{c.status !== "published" ? ` (${c.status})` : ""}</option>)}
          </select>
          <button className="btn-ghost">Add</button>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="section-title">Assign to a group</h2>
        <p className="mb-4 text-sm text-brand-muted">Enrols everyone in the chosen department in every published course of this path. Existing progress is kept.</p>
        <form action={assignPathToDepartment} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="path_id" value={path.id} />
          <div>
            <label className="label">Department</label>
            <select name="department_id" className="input" required defaultValue="">
              <option value="" disabled>Choose…</option>
              <option value="all">Everyone</option>
              {(departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div><label className="label">Due date (optional)</label><input type="date" name="due" className="input" /></div>
          <ConfirmButton message="Assign this path to the selected group?" className="btn-primary">Assign</ConfirmButton>
        </form>
      </section>

      <form action={deletePath} className="border-t border-brand-line pt-6">
        <input type="hidden" name="id" value={path.id} />
        <ConfirmButton message="Delete this learning path? Courses and learner progress are kept."><Trash2 className="h-4 w-4" /> Delete path</ConfirmButton>
      </form>
    </div>
  );
}
