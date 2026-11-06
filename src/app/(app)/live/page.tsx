import Link from "next/link";
import type { Metadata } from "next";
import { CalendarPlus, Download, ExternalLink, PlayCircle, Video } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatSessionTime, outlookComposeUrl, type LiveSession } from "@/lib/live";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Live classes" };

export default async function LivePage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const now = new Date();
  const since = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 60).toISOString();

  const [{ data: sessions }, { data: attended }, { data: courses }] = await Promise.all([
    supabase.from("live_sessions").select("*").gte("ends_at", since).neq("status", "cancelled").order("starts_at"),
    supabase.from("live_session_attendance").select("session_id").eq("user_id", profile.id),
    supabase.from("courses").select("id, slug, title"),
  ]);
  const all = (sessions ?? []) as LiveSession[];
  const joined = new Set((attended ?? []).map((a) => a.session_id as string));
  const courseById = new Map((courses ?? []).map((c) => [c.id as string, c]));
  const upcoming = all.filter((s) => new Date(s.ends_at) >= now);
  const past = all.filter((s) => new Date(s.ends_at) < now).reverse();
  const site = env.siteUrl();

  const Card = ({ s, isPast }: { s: LiveSession; isPast: boolean }) => {
    const live = new Date(s.starts_at).getTime() - 15 * 60 * 1000 <= now.getTime() && new Date(s.ends_at) >= now;
    const course = s.course_id ? courseById.get(s.course_id) : null;
    return (
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {live && <span className="badge bg-red-50 text-red-700">● Live now</span>}
            {joined.has(s.id) && <span className="badge bg-emerald-50 text-emerald-700">Attended</span>}
            <span className="text-xs font-bold uppercase tracking-wide text-brand">{formatSessionTime(s.starts_at, s.ends_at)}</span>
          </div>
          <h2 className="font-display text-lg text-brand-ink">{s.title}</h2>
          {s.host_name && <p className="text-sm text-brand-muted">Host: {s.host_name}</p>}
          {s.description && <p className="text-sm text-brand-ink/80">{s.description}</p>}
          {course && <Link href={`/courses/${course.slug}`} className="text-sm text-brand hover:underline">Part of: {course.title}</Link>}
          {(s.links?.length ?? 0) > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {s.links.map((l, i) => (
                <li key={i}>
                  <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-brand-line bg-white px-2.5 py-1 text-xs hover:border-brand hover:text-brand">
                    <ExternalLink className="h-3 w-3" /> {l.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">
          {!isPast && s.meeting_url && (
            <a href={`/live/${s.id}/join`} target="_blank" rel="noreferrer" className={live ? "btn-primary" : "btn-ghost"}>
              <Video className="h-4 w-4" /> Join class
            </a>
          )}
          {!isPast && (
            <>
              <a href={outlookComposeUrl(s, site)} target="_blank" rel="noreferrer" className="btn-ghost"><CalendarPlus className="h-4 w-4" /> Add to Outlook</a>
              <a href={`/api/live/${s.id}/ics`} className="btn-ghost"><Download className="h-4 w-4" /> Calendar file (.ics)</a>
            </>
          )}
          {isPast && s.recording_url && (
            <a href={s.recording_url} target="_blank" rel="noreferrer" className="btn-primary"><PlayCircle className="h-4 w-4" /> Watch recording</a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <PageHeader title="Live classes" description="Instructor-led sessions on Teams or Zoom. Join from here so your attendance is recorded." />
      <section className="space-y-4">
        <h2 className="section-title">Upcoming</h2>
        {upcoming.length ? upcoming.map((s) => <Card key={s.id} s={s} isPast={false} />) : <EmptyState title="No upcoming live classes" body="When a class is scheduled for you it will appear here, and in your Outlook calendar if invites are sent." />}
      </section>
      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="section-title">Recent (last 60 days)</h2>
          {past.map((s) => <Card key={s.id} s={s} isPast />)}
        </section>
      )}
    </div>
  );
}
