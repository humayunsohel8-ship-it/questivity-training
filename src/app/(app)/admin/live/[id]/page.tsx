import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, Download, Mail, Send, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ConfirmButton } from "@/components/confirm-button";
import { SessionForm } from "../session-form";
import { deleteSession, sendOutlookInvites } from "../actions";
import { formatSessionTime, outlookComposeUrl, type LiveSession } from "@/lib/live";
import { graphConfigured, graphOrganizer } from "@/lib/graph";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Admin · Live class" };

export default async function AdminLiveSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const db = createAdminClient();
  const supabase = await createClient();
  const [{ data: s }, { data: courses }, { data: departments }, { data: invitees }, { data: attendance }, { data: audience }] = await Promise.all([
    db.from("live_sessions").select("*").eq("id", id).maybeSingle(),
    db.from("courses").select("id, title").neq("status", "archived").order("title"),
    db.from("departments").select("id, name").order("name"),
    db.from("live_session_invitees").select("profile:profiles(email)").eq("session_id", id),
    db.from("live_session_attendance").select("joined_at, profile:profiles(full_name, email)").eq("session_id", id).order("joined_at"),
    supabase.rpc("session_audience", { target: id }),
  ]);
  if (!s) notFound();
  const session = s as LiveSession;
  const inviteeEmails = ((invitees ?? []) as unknown as { profile: { email: string } | null }[]).map((i) => i.profile?.email).filter(Boolean) as string[];
  const people = (audience ?? []) as { user_id: string; email: string; full_name: string | null }[];
  const attended = (attendance ?? []) as unknown as { joined_at: string; profile: { full_name: string | null; email: string } | null }[];
  const site = env.siteUrl();
  const outlookReady = graphConfigured();
  const mailto = `mailto:?bcc=${encodeURIComponent(people.map((p) => p.email).join(";"))}&subject=${encodeURIComponent(`Live class: ${session.title}`)}&body=${encodeURIComponent(
    `${formatSessionTime(session.starts_at, session.ends_at)}\n\n${session.description}\n\nJoin: ${session.meeting_url ?? "(link to follow)"}\nAdd to calendar / details: ${site}/live`,
  )}`;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/live" className="text-sm text-brand hover:underline">← Live classes</Link>
        <h1 className="page-title mt-1">{session.title}</h1>
        <p className="text-sm text-brand-muted">{formatSessionTime(session.starts_at, session.ends_at)} · {people.length} invited · {attended.length} attended</p>
      </div>

      <section className="card space-y-4 p-6">
        <h2 className="section-title">Invite learners</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-brand border border-brand-line p-4">
            <p className="font-bold">Outlook meeting invites (Microsoft 365)</p>
            {outlookReady ? (
              <form action={sendOutlookInvites} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={session.id} />
                <p className="text-sm text-brand-muted">
                  Creates this class in <b>{graphOrganizer()}</b>&apos;s Outlook calendar and emails a meeting invite to all {people.length} invited people.
                  {session.invites_sent_at && <> Last sent {formatDate(session.invites_sent_at)} — sending again updates everyone&apos;s invite.</>}
                </p>
                {!session.meeting_url && (
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="create_teams" defaultChecked /> Create a Microsoft Teams link automatically</label>
                )}
                <button className="btn-primary"><Send className="h-4 w-4" /> {session.invites_sent_at ? "Update Outlook invites" : "Send Outlook invites"}</button>
              </form>
            ) : (
              <p className="mt-2 text-sm text-brand-muted">
                Not connected. Add a Microsoft 365 app registration (see <Link href="/admin/settings" className="text-brand underline">Settings → Microsoft 365</Link>) to send real Outlook meeting invites with RSVP tracking.
              </p>
            )}
          </div>
          <div className="space-y-2 rounded-brand border border-brand-line p-4">
            <p className="font-bold">Without Microsoft 365</p>
            <a href={mailto} className="btn-ghost w-full justify-start"><Mail className="h-4 w-4" /> Email everyone from Outlook (BCC)</a>
            <a href={`/api/live/${session.id}/ics`} className="btn-ghost w-full justify-start"><Download className="h-4 w-4" /> Download calendar invite (.ics) to attach</a>
            <a href={outlookComposeUrl(session, site)} target="_blank" rel="noreferrer" className="btn-ghost w-full justify-start"><CalendarPlus className="h-4 w-4" /> Open in Outlook calendar</a>
            <p className="text-xs text-brand-muted">Learners also see the class under Live classes with Join and Add-to-Outlook buttons.</p>
          </div>
        </div>
      </section>

      <SessionForm session={session} courses={courses ?? []} departments={departments ?? []} inviteeEmails={inviteeEmails} />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-brand-line px-5 py-3 font-bold">Invited ({people.length})</div>
          <ul className="max-h-80 divide-y divide-brand-line overflow-y-auto text-sm">
            {people.map((p) => <li key={p.user_id} className="px-5 py-2">{p.full_name || p.email} <span className="text-brand-muted">· {p.email}</span></li>)}
            {!people.length && <li className="px-5 py-4 text-brand-muted">No one yet.</li>}
          </ul>
        </div>
        <div className="card overflow-hidden">
          <div className="border-b border-brand-line px-5 py-3 font-bold">Attendance ({attended.length})</div>
          <ul className="max-h-80 divide-y divide-brand-line overflow-y-auto text-sm">
            {attended.map((a, i) => (
              <li key={i} className="flex justify-between px-5 py-2">
                <span>{a.profile?.full_name || a.profile?.email}</span>
                <span className="text-brand-muted">{new Date(a.joined_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
            {!attended.length && <li className="px-5 py-4 text-brand-muted">Recorded when learners click Join in the LMS.</li>}
          </ul>
        </div>
      </section>

      <form action={deleteSession} className="border-t border-brand-line pt-6">
        <input type="hidden" name="id" value={session.id} />
        <ConfirmButton message="Delete this class? If Outlook invites were sent, attendees receive a cancellation."><Trash2 className="h-4 w-4" /> Delete class</ConfirmButton>
      </form>
    </div>
  );
}
