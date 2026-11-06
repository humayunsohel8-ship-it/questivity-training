import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, ProgressBar, StatusBadge } from "@/components/ui";
import { AssignPathForm } from "@/components/assign-path-form";
import { ConfirmButton } from "@/components/confirm-button";
import { progressFor } from "@/lib/learning";
import { assignCourse, removeEnrollment } from "../../assign-actions";
import { formatDate, isOverdue } from "@/lib/utils";

export const metadata = { title: "Admin · Learner" };

export default async function AdminLearnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: p }, { data: enrollments }, { data: attempts }, { data: certs }, { data: attended }, { data: courses }, { data: paths }] = await Promise.all([
    db.from("profiles").select("*, departments(name)").eq("id", id).maybeSingle(),
    db.from("enrollments").select("id, course_id, status, due_date, started_at, completed_at, course:courses(title, slug)").eq("user_id", id).order("due_date", { nullsFirst: false }),
    db.from("quiz_attempts").select("score, passed, created_at, lesson:lessons(title, course:courses(title))").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
    db.from("certificates").select("id, serial, issued_at, course:courses(title)").eq("user_id", id).order("issued_at", { ascending: false }),
    db.from("live_session_attendance").select("joined_at, session:live_sessions(title, starts_at)").eq("user_id", id).order("joined_at", { ascending: false }).limit(20),
    db.from("courses").select("id, title").eq("status", "published").order("title"),
    db.from("learning_paths").select("id, title").eq("status", "published").order("title"),
  ]);
  if (!p) notFound();

  type E = { id: string; course_id: string; status: string; due_date: string | null; started_at: string | null; completed_at: string | null; course: { title: string; slug: string } | null };
  const rows = (enrollments ?? []) as unknown as E[];
  const { totals, done } = await progressFor(db, id, rows.map((r) => r.course_id));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/learners" className="text-sm text-brand hover:underline">← Learners</Link>
        <PageHeader
          title={p.full_name || p.email}
          description={`${p.email}${p.job_title ? ` · ${p.job_title}` : ""}${(p.departments as { name: string } | null)?.name ? ` · ${(p.departments as { name: string }).name}` : ""} · joined ${formatDate(p.joined_on)}`}
          actions={<Link href={`/admin/users?q=${encodeURIComponent(p.email)}`} className="btn-ghost">Edit account</Link>}
        />
      </div>

      <section className="card space-y-4 p-5">
        <h2 className="section-title">Assign learning</h2>
        <form action={assignCourse} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="target" value="user" />
          <input type="hidden" name="user_id" value={id} />
          <div className="min-w-56 flex-1">
            <label className="label">Course</label>
            <select name="course_id" className="input" required defaultValue="">
              <option value="" disabled>Choose a course…</option>
              {(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div><label className="label">Due date</label><input type="date" name="due" className="input" /></div>
          <button className="btn-primary">Assign course</button>
        </form>
        <div><p className="label">Or a learning path</p><AssignPathForm userId={id} paths={paths ?? []} /></div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-brand-line px-5 py-3 font-bold">Courses ({rows.length})</div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-brand-line">
            {rows.map((e) => {
              const t = totals.get(e.course_id) ?? 0;
              const d = done.get(e.course_id) ?? 0;
              return (
                <tr key={e.id}>
                  <td className="px-5 py-3 font-bold">{e.course?.title}</td>
                  <td className="w-48 px-3"><ProgressBar value={e.status === "completed" ? 100 : t ? (100 * d) / t : 0} /><span className="text-xs text-brand-muted">{d}/{t} lessons</span></td>
                  <td className="px-3"><StatusBadge status={isOverdue(e.due_date, e.status) ? "overdue" : e.status} /></td>
                  <td className="px-3 text-brand-muted">{e.completed_at ? `Done ${formatDate(e.completed_at)}` : e.due_date ? `Due ${formatDate(e.due_date)}` : ""}</td>
                  <td className="px-5 text-right">
                    <form action={removeEnrollment}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="user_id" value={id} />
                      <ConfirmButton message="Remove this course assignment? Lesson progress is kept if it's re-assigned later." className="text-red-600 hover:underline"><Trash2 className="h-4 w-4" /></ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td className="px-5 py-6 text-brand-muted">No courses assigned.</td></tr>}
          </tbody>
        </table>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card overflow-hidden">
          <div className="border-b border-brand-line px-5 py-3 font-bold">Quiz attempts</div>
          <ul className="divide-y divide-brand-line text-sm">
            {((attempts ?? []) as unknown as { score: number; passed: boolean; created_at: string; lesson: { title: string; course: { title: string } | null } | null }[]).map((a, i) => (
              <li key={i} className="flex justify-between gap-2 px-5 py-2">
                <span className="min-w-0 truncate">{a.lesson?.course?.title}</span>
                <span className={a.passed ? "font-bold text-emerald-700" : "font-bold text-red-600"}>{a.score}%</span>
              </li>
            ))}
            {!attempts?.length && <li className="px-5 py-4 text-brand-muted">None yet.</li>}
          </ul>
        </section>
        <section className="card overflow-hidden">
          <div className="border-b border-brand-line px-5 py-3 font-bold">Certificates</div>
          <ul className="divide-y divide-brand-line text-sm">
            {((certs ?? []) as unknown as { id: string; serial: string; issued_at: string; course: { title: string } | null }[]).map((c) => (
              <li key={c.id} className="px-5 py-2">
                <Link href={`/certificates/${c.id}`} className="flex items-center gap-2 hover:text-brand"><Award className="h-4 w-4 text-brand" />{c.course?.title}</Link>
                <span className="text-xs text-brand-muted">{formatDate(c.issued_at)} · {c.serial}</span>
              </li>
            ))}
            {!certs?.length && <li className="px-5 py-4 text-brand-muted">None yet.</li>}
          </ul>
        </section>
        <section className="card overflow-hidden">
          <div className="border-b border-brand-line px-5 py-3 font-bold">Live classes attended</div>
          <ul className="divide-y divide-brand-line text-sm">
            {((attended ?? []) as unknown as { joined_at: string; session: { title: string; starts_at: string } | null }[]).map((a, i) => (
              <li key={i} className="px-5 py-2">{a.session?.title}<span className="block text-xs text-brand-muted">{formatDate(a.joined_at)}</span></li>
            ))}
            {!attended?.length && <li className="px-5 py-4 text-brand-muted">None yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
