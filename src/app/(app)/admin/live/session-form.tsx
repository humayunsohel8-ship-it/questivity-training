"use client";

import { useEffect, useState } from "react";
import { saveSession } from "./actions";
import { linksToText } from "@/lib/links";
import type { LiveSession } from "@/lib/live";

/** Local "YYYY-MM-DDTHH:mm" for a datetime-local input. */
function toLocalInput(iso: string | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SessionForm({
  session, courses, departments, inviteeEmails = [],
}: {
  session?: LiveSession;
  courses: { id: string; title: string }[];
  departments: { id: string; name: string }[];
  inviteeEmails?: string[];
}) {
  const [audience, setAudience] = useState<LiveSession["audience"]>(session?.audience ?? "all");
  const [tz, setTz] = useState("0");
  const [startLocal, setStartLocal] = useState("");
  useEffect(() => {
    setTz(String(new Date().getTimezoneOffset()));
    setStartLocal(toLocalInput(session?.starts_at));
  }, [session?.starts_at]);

  const duration = session ? Math.round((new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60000) : 60;

  return (
    <form action={saveSession} className="card grid gap-4 p-6 sm:grid-cols-6">
      <input type="hidden" name="id" value={session?.id ?? ""} />
      <input type="hidden" name="tz_offset" value={tz} />
      <div className="sm:col-span-6"><label className="label">Class title</label><input name="title" defaultValue={session?.title} className="input" required placeholder="e.g. FortiGate policy design — live walkthrough" /></div>
      <div className="sm:col-span-3"><label className="label">Starts (your local time)</label><input name="starts_local" type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} className="input" required /></div>
      <div className="sm:col-span-1"><label className="label">Minutes</label><input name="duration_min" type="number" min={15} max={600} step={15} defaultValue={duration} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Host / trainer</label><input name="host_name" defaultValue={session?.host_name ?? ""} className="input" /></div>
      <div className="sm:col-span-4">
        <label className="label">Meeting link (Teams / Zoom / Webex)</label>
        <input name="meeting_url" type="url" defaultValue={session?.meeting_url ?? ""} className="input" placeholder="https://teams.microsoft.com/l/meetup-join/…  (or leave empty to let Outlook create a Teams link)" />
      </div>
      <div className="sm:col-span-2"><label className="label">Location (optional)</label><input name="location" defaultValue={session?.location ?? ""} className="input" placeholder="Online / Santa Clara lab" /></div>
      <div className="sm:col-span-6"><label className="label">Description / agenda</label><textarea name="description" defaultValue={session?.description} rows={3} className="input" /></div>
      <div className="sm:col-span-3">
        <label className="label">Linked course (optional)</label>
        <select name="course_id" defaultValue={session?.course_id ?? ""} className="input">
          <option value="">—</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      <div className="sm:col-span-3">
        <label className="label">Status</label>
        <select name="status" defaultValue={session?.status ?? "scheduled"} className="input">
          <option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
        </select>
      </div>

      <fieldset className="space-y-3 rounded-brand border border-brand-line p-4 sm:col-span-6">
        <legend className="px-1 text-sm font-bold">Who is invited?</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {(["all", "department", "selected"] as const).map((a) => (
            <label key={a} className="flex items-center gap-2">
              <input type="radio" name="audience" value={a} checked={audience === a} onChange={() => setAudience(a)} />
              {a === "all" ? "Everyone" : a === "department" ? "A department" : "Selected people"}
            </label>
          ))}
        </div>
        {audience === "department" && (
          <select name="department_id" defaultValue={session?.department_id ?? ""} className="input" required>
            <option value="" disabled>Choose department…</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        {audience === "selected" && (
          <textarea name="invitee_emails" rows={3} defaultValue={inviteeEmails.join("\n")} className="input font-mono text-xs" placeholder="name@questivity.com, one per line" />
        )}
      </fieldset>

      <div className="sm:col-span-6">
        <label className="label">Links to share with learners (one per line: Title | https://link)</label>
        <textarea name="links" rows={3} defaultValue={linksToText(session?.links)} className="input font-mono text-xs" placeholder={"Slides | https://questivity.sharepoint.com/…\nPre-reading | https://docs.fortinet.com/…"} />
      </div>
      <div className="sm:col-span-6"><label className="label">Recording link (add after the class)</label><input name="recording_url" type="url" defaultValue={session?.recording_url ?? ""} className="input" placeholder="https://…" /></div>
      <div className="sm:col-span-6"><button className="btn-primary">{session ? "Save class" : "Schedule class"}</button></div>
    </form>
  );
}
