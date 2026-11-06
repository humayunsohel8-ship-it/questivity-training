import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { AssignPathForm } from "@/components/assign-path-form";
import { inviteUser, updateUser } from "../actions";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Admin · Users" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  await requireAdmin();
  const db = createAdminClient();
  let query = db.from("profiles").select("*").order("full_name");
  if (q) query = query.or(`full_name.ilike.%${q.replace(/[%,()]/g, "")}%,email.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const [{ data: users }, { data: departments }, { data: everyone }, { data: paths }, { data: enrollments }] = await Promise.all([
    query.limit(200),
    db.from("departments").select("id, name").order("name"),
    db.from("profiles").select("id, full_name, email").eq("is_active", true).order("full_name"),
    db.from("learning_paths").select("id, title").eq("status", "published").order("title"),
    db.from("enrollments").select("user_id, status"),
  ]);

  const stats = new Map<string, { total: number; done: number }>();
  for (const e of enrollments ?? []) {
    const s = stats.get(e.user_id) ?? { total: 0, done: 0 };
    s.total++;
    if (e.status === "completed") s.done++;
    stats.set(e.user_id, s);
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Users" description="Employees appear here the first time they sign in, or when you invite them. Set role, department and manager to drive reporting and team views." />

      <div className="grid gap-4 lg:grid-cols-2">
        <form className="card flex gap-2 p-4">
          <input name="q" defaultValue={q} placeholder="Search name or email" className="input flex-1" />
          <button className="btn-ghost">Search</button>
        </form>
        <form action={inviteUser} className="card flex flex-wrap gap-2 p-4">
          <input name="full_name" placeholder="Full name" className="input flex-1" />
          <input name="email" type="email" placeholder="name@questivity.com" className="input flex-1" required />
          <button className="btn-primary">Invite</button>
        </form>
      </div>

      <div className="space-y-3">
        {((users ?? []) as Profile[]).map((u) => {
          const s = stats.get(u.id);
          return (
            <div key={u.id} className={`card p-4 ${u.is_active ? "" : "opacity-60"}`}>
              <form action={updateUser} className="grid items-end gap-3 md:grid-cols-12">
                <input type="hidden" name="id" value={u.id} />
                <div className="md:col-span-3">
                  <label className="label">{u.email}</label>
                  <input name="full_name" defaultValue={u.full_name ?? ""} placeholder="Full name" className="input" />
                </div>
                <div className="md:col-span-2"><label className="label">Job title</label><input name="job_title" defaultValue={u.job_title ?? ""} className="input" /></div>
                <div className="md:col-span-2">
                  <label className="label">Role</label>
                  <select name="role" defaultValue={u.role} className="input">
                    <option value="learner">Learner</option><option value="manager">Manager</option><option value="admin">Admin</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Department</label>
                  <select name="department_id" defaultValue={u.department_id ?? ""} className="input">
                    <option value="">—</option>
                    {(departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Manager</label>
                  <select name="manager_id" defaultValue={u.manager_id ?? ""} className="input">
                    <option value="">—</option>
                    {(everyone ?? []).filter((p) => p.id !== u.id).map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3 md:col-span-1">
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="is_active" defaultChecked={u.is_active} /> Active</label>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-12">
                  <p className="text-xs text-brand-muted">
                    Joined {formatDate(u.joined_on)} · {s ? `${s.done}/${s.total} courses completed` : "No enrolments"}
                  </p>
                  <button className="btn-ghost py-1.5">Save</button>
                </div>
              </form>
              <div className="mt-3 border-t border-brand-line pt-3">
                <AssignPathForm userId={u.id} paths={paths ?? []} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
