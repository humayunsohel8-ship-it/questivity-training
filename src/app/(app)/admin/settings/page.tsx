import { Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteDepartment, saveDepartment, saveSettings } from "../actions";
import { brand } from "@/config/brand";
import { env } from "@/lib/env";
import { graphConfigured, graphOrganizer } from "@/lib/graph";

export const metadata = { title: "Admin · Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: settings }, { data: departments }] = await Promise.all([
    db.from("org_settings").select("*").eq("id", true).single(),
    db.from("departments").select("id, name").order("name"),
  ]);
  const aiKeyConfigured = env.hasAnthropicKey();

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
        <div className="rounded-brand border border-brand-line bg-brand-surface p-4 sm:col-span-2">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="ai_assistant_enabled" defaultChecked={settings?.ai_assistant_enabled ?? false} className="mt-1" />
            <span>
              <span className="block font-semibold">AI answers for {brand.assistantName} (Claude)</span>
              <span className="block text-sm text-brand-muted">
                <b>On:</b> Claude writes an answer from the knowledge base and cites its sources.{" "}
                <b>Off:</b> the assistant runs in search mode — it lists the most relevant articles with excerpts. No AI service is called.
              </span>
              <span className={`mt-2 inline-block text-xs font-semibold ${aiKeyConfigured ? "text-emerald-700" : "text-amber-700"}`}>
                {aiKeyConfigured
                  ? "✓ Claude API key is configured on the server."
                  : "No Claude API key configured — the assistant stays in search mode until ANTHROPIC_API_KEY is added in the hosting environment, even if this is switched on."}
              </span>
            </span>
          </label>
        </div>
        <div className="sm:col-span-2"><button className="btn-primary">Save settings</button></div>
      </form>

      <section className="card space-y-3 p-6">
        <h2 className="section-title">Microsoft 365 / Outlook (optional)</h2>
        {graphConfigured() ? (
          <p className="text-sm text-emerald-700">✓ Connected. Live-class invites are sent from <b>{graphOrganizer()}</b>&apos;s Outlook calendar.</p>
        ) : (
          <div className="space-y-2 text-sm text-brand-muted">
            <p>Not connected — live classes still work with &quot;Add to Outlook&quot; links and .ics calendar files. To send real Outlook meeting invites (with RSVPs and automatic Teams links):</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Microsoft Entra admin center → App registrations → <b>New registration</b> (name: Questivity LMS).</li>
              <li>Certificates &amp; secrets → <b>New client secret</b>; copy the value.</li>
              <li>API permissions → Microsoft Graph → Application → <b>Calendars.ReadWrite</b> → Grant admin consent.</li>
              <li>In Netlify → Environment variables add <code>MS_GRAPH_TENANT_ID</code>, <code>MS_GRAPH_CLIENT_ID</code>, <code>MS_GRAPH_CLIENT_SECRET</code> (secret) and <code>MS_GRAPH_ORGANIZER</code> (e.g. training@questivity.com), then redeploy.</li>
            </ol>
          </div>
        )}
      </section>

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
