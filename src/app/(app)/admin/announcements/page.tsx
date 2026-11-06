import { Pin, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { Markdown } from "@/components/markdown";
import { deleteAnnouncement, saveAnnouncement } from "./actions";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Admin · Announcements" };

export default async function AdminAnnouncementsPage() {
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: items }, { data: departments }] = await Promise.all([
    db.from("announcements").select("*, departments(name)").order("pinned", { ascending: false }).order("starts_at", { ascending: false }),
    db.from("departments").select("id, name").order("name"),
  ]);
  const now = new Date();

  return (
    <div className="space-y-8">
      <PageHeader title="Announcements" description="Messages shown at the top of every learner's dashboard — new courses, training deadlines, upcoming live classes." />

      <form action={saveAnnouncement} className="card grid gap-4 p-6 sm:grid-cols-4">
        <div className="sm:col-span-4"><label className="label">Title</label><input name="title" className="input" required placeholder="e.g. Complete Information Security Essentials by 30 November" /></div>
        <div className="sm:col-span-4"><label className="label">Message (markdown, links allowed)</label><textarea name="body_md" rows={3} className="input" /></div>
        <div>
          <label className="label">Show to</label>
          <select name="department_id" className="input" defaultValue="">
            <option value="">Everyone</option>
            {(departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div><label className="label">Show until (optional)</label><input type="date" name="ends_on" className="input" /></div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="pinned" /> Pin to top</label>
        <div className="self-end"><button className="btn-primary w-full">Publish</button></div>
      </form>

      <div className="space-y-3">
        {(items ?? []).map((a) => {
          const expired = a.ends_at && new Date(a.ends_at) < now;
          return (
            <div key={a.id} className={`card flex gap-4 p-5 ${expired ? "opacity-50" : ""}`}>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-display text-lg">{a.pinned && <Pin className="h-4 w-4 text-brand" />}{a.title}</p>
                <p className="text-xs text-brand-muted">
                  {(a.departments as { name: string } | null)?.name ?? "Everyone"} · from {formatDate(a.starts_at)}{a.ends_at ? ` until ${formatDate(a.ends_at)}` : ""}{expired ? " · expired" : ""}
                </p>
                {a.body_md && <Markdown className="prose-sm mt-2">{a.body_md}</Markdown>}
              </div>
              <form action={deleteAnnouncement}>
                <input type="hidden" name="id" value={a.id} />
                <ConfirmButton message="Delete this announcement?" className="text-red-600 hover:underline"><Trash2 className="h-4 w-4" /></ConfirmButton>
              </form>
            </div>
          );
        })}
        {!items?.length && <p className="text-sm text-brand-muted">No announcements yet.</p>}
      </div>
    </div>
  );
}
