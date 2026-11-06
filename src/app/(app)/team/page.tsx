import type { Metadata } from "next";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader, ProgressBar, StatusBadge } from "@/components/ui";
import { AssignPathForm } from "@/components/assign-path-form";
import { formatDate, isOverdue } from "@/lib/utils";

export const metadata: Metadata = { title: "My team" };

export default async function TeamPage() {
  const me = await requireManager();
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("profiles")
    .select("id, full_name, email, job_title")
    .eq("manager_id", me.id)
    .eq("is_active", true)
    .order("full_name");

  const ids = (reports ?? []).map((r) => r.id);
  const [{ data: enrollments }, { data: paths }] = await Promise.all([
    ids.length
      ? supabase.from("enrollments").select("user_id, status, due_date, course:courses(title)").in("user_id", ids)
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("learning_paths").select("id, title").eq("status", "published").order("title"),
  ]);

  type Row = { user_id: string; status: string; due_date: string | null; course: { title: string } | null };
  const byUser = new Map<string, Row[]>();
  for (const e of (enrollments ?? []) as unknown as Row[]) byUser.set(e.user_id, [...(byUser.get(e.user_id) ?? []), e]);

  return (
    <div>
      <PageHeader title="My team" description="Learning progress for your direct reports. Assign paths to keep skills on track." />
      {!reports?.length ? (
        <EmptyState title="No direct reports yet" body="An administrator sets each employee's manager in Admin → Users." />
      ) : (
        <div className="space-y-5">
          {reports.map((r) => {
            const rows = byUser.get(r.id) ?? [];
            const done = rows.filter((x) => x.status === "completed").length;
            const overdue = rows.filter((x) => isOverdue(x.due_date, x.status));
            return (
              <section key={r.id} className="card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{r.full_name || r.email}</p>
                    <p className="text-xs text-brand-muted">{r.job_title || r.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-40">
                      <ProgressBar value={rows.length ? (100 * done) / rows.length : 0} />
                      <p className="mt-1 text-xs text-brand-muted">{done}/{rows.length} courses · {overdue.length} overdue</p>
                    </div>
                    <AssignPathForm userId={r.id} paths={paths ?? []} />
                  </div>
                </div>
                {rows.length > 0 && (
                  <ul className="mt-4 divide-y divide-brand-line border-t border-brand-line text-sm">
                    {rows.map((x, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 py-2">
                        <span>{x.course?.title}</span>
                        <span className="flex items-center gap-3 text-xs text-brand-muted">
                          {x.due_date && `Due ${formatDate(x.due_date)}`}
                          <StatusBadge status={isOverdue(x.due_date, x.status) ? "overdue" : x.status} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
