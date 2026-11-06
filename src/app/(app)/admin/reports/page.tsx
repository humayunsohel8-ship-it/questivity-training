import Link from "next/link";
import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, ProgressBar, StatusBadge } from "@/components/ui";

export const metadata = { title: "Admin · Reports" };

export default async function AdminReportsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const db = createAdminClient();
  const [{ data: stats }, { data: compliance }, { data: sessions }, { data: attendance }] = await Promise.all([
    supabase.rpc("admin_course_stats"),
    supabase.rpc("admin_department_compliance"),
    db.from("live_sessions").select("id, title, starts_at").lt("starts_at", new Date().toISOString()).neq("status", "cancelled").order("starts_at", { ascending: false }).limit(10),
    db.from("live_session_attendance").select("session_id"),
  ]);
  const att = new Map<string, number>();
  for (const a of attendance ?? []) att.set(a.session_id, (att.get(a.session_id) ?? 0) + 1);

  type CS = { course_id: string; title: string; status: string; is_mandatory: boolean; enrolled: number; completed: number; overdue: number; avg_quiz_score: number | null };
  type DC = { department: string; learners: number; mandatory_assigned: number; mandatory_completed: number; overdue: number };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Reports"
        description="Course completion, mandatory-training compliance and live-class attendance. Export to CSV for Excel or Power BI."
        actions={
          <div className="flex flex-wrap gap-2">
            <a href="/admin/reports/export?type=enrollments" className="btn-ghost"><Download className="h-4 w-4" /> All enrolments (CSV)</a>
            <a href="/admin/reports/export?type=learners" className="btn-ghost"><Download className="h-4 w-4" /> Learners (CSV)</a>
            <a href="/admin/reports/export?type=attendance" className="btn-ghost"><Download className="h-4 w-4" /> Live attendance (CSV)</a>
          </div>
        }
      />

      <section className="card overflow-hidden">
        <div className="border-b border-brand-line px-5 py-4"><h2 className="section-title">Course completion</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-surface text-left text-xs uppercase tracking-wide text-brand-muted">
              <tr><th className="px-5 py-3">Course</th><th className="px-3">Completion</th><th className="px-3 text-right">Enrolled</th><th className="px-3 text-right">Completed</th><th className="px-3 text-right">Overdue</th><th className="px-3 text-right">Avg quiz</th><th className="px-5">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-brand-line">
              {((stats ?? []) as CS[]).map((s) => {
                const pct = s.enrolled ? Math.round((100 * s.completed) / s.enrolled) : 0;
                return (
                  <tr key={s.course_id}>
                    <td className="px-5 py-3"><Link href={`/admin/courses/${s.course_id}`} className="font-bold hover:text-brand">{s.title}</Link>{s.is_mandatory && <span className="ml-2 text-xs font-bold text-brand">MANDATORY</span>}</td>
                    <td className="w-56 px-3"><ProgressBar value={pct} /><span className="text-xs text-brand-muted">{pct}%</span></td>
                    <td className="px-3 text-right">{s.enrolled}</td>
                    <td className="px-3 text-right">{s.completed}</td>
                    <td className={`px-3 text-right ${s.overdue ? "font-bold text-red-600" : ""}`}>{s.overdue}</td>
                    <td className="px-3 text-right">{s.avg_quiz_score ?? "—"}</td>
                    <td className="px-5"><StatusBadge status={s.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-brand-line px-5 py-4">
          <h2 className="section-title">Mandatory training compliance by department</h2>
          <p className="text-xs text-brand-muted">Courses marked mandatory (e.g. Information Security Essentials).</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-brand-surface text-left text-xs uppercase tracking-wide text-brand-muted">
            <tr><th className="px-5 py-3">Department</th><th className="px-3 text-right">People</th><th className="px-3">Compliance</th><th className="px-5 text-right">Overdue</th></tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {((compliance ?? []) as DC[]).map((d) => {
              const pct = d.mandatory_assigned ? Math.round((100 * d.mandatory_completed) / d.mandatory_assigned) : 0;
              return (
                <tr key={d.department}>
                  <td className="px-5 py-3 font-bold">{d.department}</td>
                  <td className="px-3 text-right">{d.learners}</td>
                  <td className="w-64 px-3"><ProgressBar value={pct} /><span className="text-xs text-brand-muted">{d.mandatory_completed}/{d.mandatory_assigned} mandatory enrolments complete ({pct}%)</span></td>
                  <td className={`px-5 text-right ${d.overdue ? "font-bold text-red-600" : ""}`}>{d.overdue}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-brand-line px-5 py-4"><h2 className="section-title">Recent live classes</h2></div>
        <ul className="divide-y divide-brand-line text-sm">
          {(sessions ?? []).map((s) => (
            <li key={s.id} className="flex justify-between px-5 py-3">
              <Link href={`/admin/live/${s.id}`} className="font-bold hover:text-brand">{s.title}</Link>
              <span className="text-brand-muted">{att.get(s.id) ?? 0} attended</span>
            </li>
          ))}
          {!sessions?.length && <li className="px-5 py-6 text-brand-muted">No past classes yet.</li>}
        </ul>
      </section>
    </div>
  );
}
