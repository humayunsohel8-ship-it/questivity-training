import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { SessionForm } from "./session-form";
import { formatSessionTime, type LiveSession } from "@/lib/live";

export const metadata = { title: "Admin · Live classes" };

export default async function AdminLivePage() {
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: sessions }, { data: courses }, { data: departments }, { data: attendance }] = await Promise.all([
    db.from("live_sessions").select("*").order("starts_at", { ascending: false }).limit(100),
    db.from("courses").select("id, title").neq("status", "archived").order("title"),
    db.from("departments").select("id, name").order("name"),
    db.from("live_session_attendance").select("session_id"),
  ]);
  const counts = new Map<string, number>();
  for (const a of attendance ?? []) counts.set(a.session_id, (counts.get(a.session_id) ?? 0) + 1);
  const now = Date.now();

  return (
    <div className="space-y-8">
      <PageHeader title="Live classes" description="Schedule instructor-led sessions, share links, send Outlook invites and track attendance." />

      <details className="group">
        <summary className="btn-primary w-fit cursor-pointer list-none">+ Schedule a live class</summary>
        <div className="mt-4">
          <SessionForm courses={courses ?? []} departments={departments ?? []} />
        </div>
      </details>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-surface text-left text-xs uppercase tracking-wide text-brand-muted">
            <tr><th className="px-5 py-3">Class</th><th className="px-3">When</th><th className="px-3">Audience</th><th className="px-3">Outlook</th><th className="px-3 text-right">Attended</th><th className="px-5">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {((sessions ?? []) as LiveSession[]).map((s) => (
              <tr key={s.id} className="hover:bg-brand-surface/60">
                <td className="px-5 py-3"><Link href={`/admin/live/${s.id}`} className="font-bold hover:text-brand">{s.title}</Link>{s.host_name && <span className="block text-xs text-brand-muted">{s.host_name}</span>}</td>
                <td className="px-3">{formatSessionTime(s.starts_at, s.ends_at)}</td>
                <td className="px-3 capitalize">{s.audience}</td>
                <td className="px-3">{s.invites_sent_at ? <span className="text-emerald-700">Invites sent</span> : <span className="text-brand-muted">—</span>}</td>
                <td className="px-3 text-right">{counts.get(s.id) ?? 0}</td>
                <td className="px-5">
                  {s.status === "cancelled" ? <span className="badge bg-red-50 text-red-700">Cancelled</span>
                    : new Date(s.ends_at).getTime() < now ? <span className="badge bg-slate-100 text-slate-600">Finished</span>
                    : <span className="badge bg-brand-light text-brand-dark">Upcoming</span>}
                </td>
              </tr>
            ))}
            {!sessions?.length && <tr><td colSpan={6} className="px-5 py-8 text-center text-brand-muted">No live classes yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
