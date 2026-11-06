import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin" };

type Overview = Record<"learners" | "courses_published" | "kb_published" | "enrollments" | "completed" | "overdue" | "certificates" | "questions_30d" | "unanswered_30d" | "thumbs_down_30d", number>;

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const [{ data: overview }, { data: stats }, { data: gaps }, { data: overdue }] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase.rpc("admin_course_stats"),
    supabase.rpc("admin_content_gaps", { p_limit: 15 }),
    supabase
      .from("enrollments")
      .select("due_date, status, profile:profiles!enrollments_user_id_fkey(full_name, email), course:courses(title)")
      .neq("status", "completed")
      .lt("due_date", new Date().toISOString().slice(0, 10))
      .order("due_date")
      .limit(15),
  ]);
  const o = (overview ?? {}) as Overview;
  const completion = o.enrollments ? Math.round((100 * o.completed) / o.enrollments) : 0;

  return (
    <div className="space-y-10">
      <PageHeader title="Learning overview" description="Organisation-wide progress, compliance and knowledge-base health." />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active employees" value={o.learners ?? 0} />
        <StatCard label="Completion rate" value={`${completion}%`} hint={`${o.completed ?? 0} of ${o.enrollments ?? 0} enrolments`} tone="good" />
        <StatCard label="Overdue" value={o.overdue ?? 0} tone={o.overdue ? "warn" : "default"} />
        <StatCard label="Certificates issued" value={o.certificates ?? 0} />
        <StatCard label="Published courses" value={o.courses_published ?? 0} />
        <StatCard label="Published KB articles" value={o.kb_published ?? 0} />
        <StatCard label="Assistant questions (30d)" value={o.questions_30d ?? 0} />
        <StatCard label="Unanswered / 👎 (30d)" value={`${o.unanswered_30d ?? 0} / ${o.thumbs_down_30d ?? 0}`} tone={o.unanswered_30d ? "warn" : "default"} />
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-brand-line px-5 py-4"><h2 className="section-title">Courses</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-surface text-left text-xs uppercase tracking-wide text-brand-muted">
              <tr><th className="px-5 py-3">Course</th><th className="px-3">Status</th><th className="px-3 text-right">Enrolled</th><th className="px-3 text-right">Completed</th><th className="px-3 text-right">Overdue</th><th className="px-5 text-right">Avg quiz</th></tr>
            </thead>
            <tbody className="divide-y divide-brand-line">
              {(stats ?? []).map((s: { course_id: string; title: string; status: string; is_mandatory: boolean; enrolled: number; completed: number; overdue: number; avg_quiz_score: number | null }) => (
                <tr key={s.course_id}>
                  <td className="px-5 py-3"><Link href={`/admin/courses/${s.course_id}`} className="font-medium hover:text-brand">{s.title}</Link>{s.is_mandatory && <span className="ml-2 text-xs text-brand-accent">mandatory</span>}</td>
                  <td className="px-3"><StatusBadge status={s.status} /></td>
                  <td className="px-3 text-right">{s.enrolled}</td>
                  <td className="px-3 text-right">{s.completed}</td>
                  <td className={`px-3 text-right ${s.overdue ? "font-semibold text-red-600" : ""}`}>{s.overdue}</td>
                  <td className="px-5 text-right">{s.avg_quiz_score ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-brand-line px-5 py-4">
            <h2 className="section-title">Knowledge gaps</h2>
            <p className="text-xs text-brand-muted">Questions the assistant couldn&apos;t answer, or answers marked unhelpful. Write articles for these.</p>
          </div>
          <ul className="divide-y divide-brand-line text-sm">
            {(gaps ?? []).map((g: { asked_at: string; question: string; reason: string; user_email: string }, i: number) => (
              <li key={i} className="px-5 py-3">
                <p className="font-medium">{g.question}</p>
                <p className="text-xs text-brand-muted">{g.reason} · {formatDate(g.asked_at)}</p>
              </li>
            ))}
            {!gaps?.length && <li className="px-5 py-6 text-brand-muted">No gaps recorded yet.</li>}
          </ul>
          <div className="border-t border-brand-line px-5 py-3"><Link href="/admin/kb/new" className="text-sm font-semibold text-brand hover:underline">+ Write an article</Link></div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-brand-line px-5 py-4"><h2 className="section-title">Overdue assignments</h2></div>
          <ul className="divide-y divide-brand-line text-sm">
            {((overdue ?? []) as unknown as { due_date: string; profile: { full_name: string | null; email: string } | null; course: { title: string } | null }[]).map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="font-medium">{e.profile?.full_name || e.profile?.email}</p>
                  <p className="text-xs text-brand-muted">{e.course?.title}</p>
                </div>
                <span className="text-xs font-semibold text-red-600">Due {formatDate(e.due_date)}</span>
              </li>
            ))}
            {!overdue?.length && <li className="px-5 py-6 text-brand-muted">Nothing overdue. 🎉</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
