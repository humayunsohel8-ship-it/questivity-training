import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatusBadge } from "@/components/ui";
import { createCourse } from "../actions";
import { minutesLabel, formatDate } from "@/lib/utils";

export const metadata = { title: "Admin · Courses" };

export default async function AdminCoursesPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const isNew = (await searchParams).new === "1";
  await requireAdmin();
  const db = createAdminClient();
  const { data: courses } = await db.from("courses").select("id, title, slug, category, level, status, is_mandatory, duration_minutes, updated_at").order("updated_at", { ascending: false });

  return (
    <div className="space-y-8">
      <PageHeader title="Courses" description="Create and manage courses, modules, lessons and quizzes." />

      <details id="new" className="card p-5" open={isNew}>
        <summary className="cursor-pointer font-semibold text-brand">+ New course</summary>
        <form action={createCourse} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Title</label><input name="title" className="input" required /></div>
          <div><label className="label">Category</label><input name="category" className="input" placeholder="e.g. Networking" /></div>
          <div>
            <label className="label">Level</label>
            <select name="level" className="input"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select>
          </div>
          <div className="sm:col-span-2"><label className="label">Summary</label><input name="summary" className="input" /></div>
          <div className="sm:col-span-2"><button className="btn-primary">Create course</button></div>
        </form>
      </details>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-surface text-left text-xs uppercase tracking-wide text-brand-muted">
            <tr><th className="px-5 py-3">Title</th><th className="px-3">Category</th><th className="px-3">Level</th><th className="px-3">Length</th><th className="px-3">Status</th><th className="px-5">Updated</th></tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {(courses ?? []).map((c) => (
              <tr key={c.id} className="hover:bg-brand-surface/60">
                <td className="px-5 py-3">
                  <Link href={`/admin/courses/${c.id}`} className="font-medium hover:text-brand">{c.title}</Link>
                  {c.is_mandatory && <span className="ml-2 text-xs text-brand-accent">mandatory</span>}
                </td>
                <td className="px-3">{c.category}</td>
                <td className="px-3">{c.level}</td>
                <td className="px-3">{minutesLabel(c.duration_minutes)}</td>
                <td className="px-3"><StatusBadge status={c.status} /></td>
                <td className="px-5 text-brand-muted">{formatDate(c.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
