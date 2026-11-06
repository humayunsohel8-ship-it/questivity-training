import { Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteDepartment, saveDepartment, saveSettings } from "../actions";

export const metadata = { title: "Admin · Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: settings }, { data: departments }] = await Promise.all([
    db.from("org_settings").select("*").eq("id", true).single(),
    db.from("departments").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" />

      <form action={saveSettings} className="card grid gap-4 p-6 sm:grid-cols-2">
        <div>
          <label className="label">Allowed sign-up email domains</label>
          <input name="allowed_email_domains" defaultValue={(settings?.allowed_email_domains ?? []).join(", ")} className="input" placeholder="questivity.com" />
          <p className="mt-1 text-xs text-brand-muted">Enforced by the database. Leave empty to allow any domain (not recommended). Also set ALLOWED_EMAIL_DOMAINS in the hosting environment.</p>
        </div>
        <div>
          <label className="label">Quiz pass mark (%)</label>
          <input name="quiz_pass_mark" type="number" min={0} max={100} defaultValue={settings?.quiz_pass_mark ?? 70} className="input" />
        </div>
        <div className="sm:col-span-2"><button className="btn-primary">Save settings</button></div>
      </form>

      <section className="card p-6">
        <h2 className="section-title mb-4">Departments</h2>
        <div className="space-y-2">
          {(departments ?? []).map((d) => (
            <div key={d.id} className="flex gap-2">
              <form action={saveDepartment} className="flex flex-1 gap-2">
                <input type="hidden" name="id" value={d.id} />
                <input name="name" defaultValue={d.name} className="input flex-1" required />
                <button className="btn-ghost">Save</button>
              </form>
              <form action={deleteDepartment}>
                <input type="hidden" name="id" value={d.id} />
                <ConfirmButton message={`Delete department "${d.name}"? Members keep their accounts.`} className="btn-ghost text-red-600"><Trash2 className="h-4 w-4" /></ConfirmButton>
              </form>
            </div>
          ))}
          <form action={saveDepartment} className="flex gap-2 pt-2">
            <input name="name" placeholder="New department" className="input flex-1" required />
            <button className="btn-primary">Add</button>
          </form>
        </div>
      </section>
    </div>
  );
}
