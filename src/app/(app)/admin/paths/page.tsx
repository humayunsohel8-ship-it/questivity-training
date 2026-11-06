import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatusBadge } from "@/components/ui";
import { savePath } from "../actions";

export const metadata = { title: "Admin · Learning paths" };

export default async function AdminPathsPage() {
  await requireAdmin();
  const db = createAdminClient();
  const { data: paths } = await db.from("learning_paths").select("id, title, audience, status, is_onboarding, default_due_days, learning_path_courses(course_id)").order("title");

  return (
    <div className="space-y-8">
      <PageHeader title="Learning paths" description="Group courses into paths. Onboarding paths are assigned automatically to every new joiner on first sign-in." />

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold text-brand">+ New learning path</summary>
        <form action={savePath} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Title</label><input name="title" className="input" required /></div>
          <div><label className="label">Audience</label><input name="audience" className="input" placeholder="e.g. Network engineers" /></div>
          <div><label className="label">Default due (days after assignment)</label><input name="default_due_days" type="number" defaultValue={30} className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Description</label><input name="description" className="input" /></div>
          <input type="hidden" name="status" value="draft" />
          <div className="sm:col-span-2"><button className="btn-primary">Create path</button></div>
        </form>
      </details>

      <div className="grid gap-4 md:grid-cols-2">
        {(paths ?? []).map((p) => (
          <Link key={p.id} href={`/admin/paths/${p.id}`} className="card p-5 hover:shadow-md">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-semibold">{p.title}</h2>
              <StatusBadge status={p.status} />
            </div>
            <p className="mt-1 text-sm text-brand-muted">{p.audience}</p>
            <p className="mt-3 text-xs text-brand-muted">
              {(p.learning_path_courses as unknown[]).length} courses · due in {p.default_due_days} days
              {p.is_onboarding && <span className="ml-2 font-semibold text-brand-accent">Auto-assigned to new joiners</span>}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
