import Link from "next/link";
import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, ProgressBar, StatCard } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Admin · Learners" };

type Row = {
  user_id: string; email: string; full_name: string | null; role: string; department: string | null; is_active: boolean;
  enrolled: number; completed: number; in_progress: number; overdue: number; certificates: number;
  avg_quiz_score: number | null; last_activity: string | null; joined_on: string | null;
};

export default async function AdminLearnersPage({ searchParams }: { searchParams: Promise<{ q?: string; dept?: string; filter?: string }> }) {
  const { q = "", dept = "", filter = "" } = await searchParams;
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_learner_stats");
  const all = (data ?? []) as Row[];
  const departments = [...new Set(all.map((r) => r.department).filter(Boolean) as string[])].sort();

  let rows = all;
  if (q) rows = rows.filter((r) => `${r.full_name ?? ""} ${r.email}`.toLowerCase().includes(q.toLowerCase()));
  if (dept) rows = rows.filter((r) => (r.department ?? "") === dept);
  if (filter === "overdue") rows = rows.filter((r) => r.overdue > 0);
  if (filter === "inactive30") rows = rows.filter((r) => !r.last_activity || Date.now() - new Date(r.last_activity).getTime() > 30 * 864e5);
  if (filter === "notstarted") rows = rows.filter((r) => r.enrolled > 0 && r.completed === 0 && r.in_progress === 0);

  const totals = all.reduce((t, r) => ({ enrolled: t.enrolled + Number(r.enrolled), completed: t.completed + Number(r.completed), overdue: t.overdue + Number(r.overdue) }), { enrolled: 0, completed: 0, overdue: 0 });
  const activeLearners = all.filter((r) => r.last_activity && Date.now() - new Date(r.last_activity).getTime() < 30 * 864e5).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Learners"
        description="Every employee's progress across courses, quizzes, certificates and live classes."
        actions={<a href="/admin/reports/export?type=learners" className="btn-ghost"><Download className="h-4 w-4" /> Export CSV</a>}
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Learners" value={all.length} />
        <StatCard label="Active (30 days)" value={activeLearners} hint={`${all.length ? Math.round((100 * activeLearners) / all.length) : 0}% of learners`} />
        <StatCard label="Completion rate" value={`${totals.enrolled ? Math.round((100 * totals.completed) / totals.enrolled) : 0}%`} hint={`${totals.completed} of ${totals.enrolled} enrolments`} tone="good" />
        <StatCard label="Overdue enrolments" value={totals.overdue} tone={totals.overdue ? "warn" : "default"} />
      </section>

      <form className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1"><label className="label">Search</label><input name="q" defaultValue={q} placeholder="Name or email" className="input" /></div>
        <div>
          <label className="label">Department</label>
          <select name="dept" defaultValue={dept} className="input">
            <option value="">All</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Show</label>
          <select name="filter" defaultValue={filter} className="input">
            <option value="">Everyone</option>
            <option value="overdue">Has overdue courses</option>
            <option value="notstarted">Assigned but not started</option>
            <option value="inactive30">No activity in 30 days</option>
          </select>
        </div>
        <button className="btn-primary">Apply</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-surface text-left text-xs uppercase tracking-wide text-brand-muted">
            <tr>
              <th className="px-5 py-3">Learner</th><th className="px-3">Department</th><th className="px-3">Progress</th>
              <th className="px-3 text-right">Overdue</th><th className="px-3 text-right">Certificates</th><th className="px-3 text-right">Avg quiz</th><th className="px-5">Last active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {rows.map((r) => (
              <tr key={r.user_id} className={`hover:bg-brand-surface/60 ${r.is_active ? "" : "opacity-50"}`}>
                <td className="px-5 py-3">
                  <Link href={`/admin/learners/${r.user_id}`} className="font-bold hover:text-brand">{r.full_name || r.email}</Link>
                  <span className="block text-xs text-brand-muted">{r.email}{r.role !== "learner" && ` · ${r.role}`}</span>
                </td>
                <td className="px-3">{r.department ?? "—"}</td>
                <td className="w-48 px-3">
                  <ProgressBar value={r.enrolled ? (100 * r.completed) / r.enrolled : 0} />
                  <span className="text-xs text-brand-muted">{r.completed}/{r.enrolled} completed</span>
                </td>
                <td className={`px-3 text-right ${r.overdue ? "font-bold text-red-600" : ""}`}>{r.overdue}</td>
                <td className="px-3 text-right">{r.certificates}</td>
                <td className="px-3 text-right">{r.avg_quiz_score ?? "—"}</td>
                <td className="px-5 text-brand-muted">{r.last_activity ? formatDate(r.last_activity) : "Never"}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="px-5 py-8 text-center text-brand-muted">No learners match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
