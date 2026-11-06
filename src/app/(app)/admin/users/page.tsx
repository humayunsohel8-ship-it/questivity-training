import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { AssignPathForm } from "@/components/assign-path-form";
import { createUserWithPassword, resetUserPassword, updateUser } from "../actions";
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
      <PageHeader title="Users" description="Create accounts with a user ID (work email) and a temporary password. Each person is asked to set their own password the first time they sign in." />

      <section className="card p-5">
        <h2 className="section-title mb-1">Add a user</h2>
        <p className="mb-4 text-sm text-brand-muted">Share the email and temporary password with the employee privately (in person or by phone — not in a group chat).</p>
        <form action={createUserWithPassword} className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2"><label className="label">Full name</label><input name="full_name" className="input" required /></div>
          <div className="md:col-span-2"><label className="label">User ID (work email)</label><input name="email" type="email" placeholder="name@questivity.com" className="input" required /></div>
          <div className="md:col-span-2"><label className="label">Temporary password</label><input name="password" type="text" minLength={10} autoComplete="off" placeholder="min. 10 characters" className="input font-mono" required /></div>
          <div className="md:col-span-2">
            <label className="label">Role</label>
            <select name="role" className="input" defaultValue="learner"><option value="learner">Learner</option><option value="manager">Manager</option><option value="admin">Admin</option></select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Department</label>
            <select name="department_id" className="input" defaultValue="">
              <option value="">—</option>
              {(departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex items-end md:col-span-2"><button className="btn-primary w-full">Create user</button></div>
        </form>
      </section>

      <form className="card flex gap-2 p-4">
        <input name="q" defaultValue={q} placeholder="Search name or email" className="input flex-1" />
        <button className="btn-ghost">Search</button>
      </form>

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
              <div className="mt-3 flex flex-col gap-3 border-t border-brand-line pt-3 lg:flex-row lg:items-center lg:justify-between">
                <AssignPathForm userId={u.id} paths={paths ?? []} />
                <form action={resetUserPassword} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <input name="password" type="text" minLength={10} autoComplete="off" placeholder="New temporary password" className="input w-56 py-1.5 font-mono" required />
                  <button className="btn-ghost py-1.5">Reset password</button>
                  {u.must_change_password && <span className="text-xs text-amber-700">Must set own password at next sign-in</span>}
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
