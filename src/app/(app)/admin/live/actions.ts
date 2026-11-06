"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseLinks } from "@/lib/links";
import { fstr } from "@/lib/utils";
import { env } from "@/lib/env";
import { cancelOutlookEvent, graphConfigured, upsertOutlookEvent } from "@/lib/graph";
import type { LiveSession } from "@/lib/live";

async function back(message: string, kind: "error" | "saved" = "error"): Promise<never> {
  const referer = (await headers()).get("referer");
  let path = "/admin/live";
  try {
    if (referer) path = new URL(referer).pathname;
  } catch {
    /* default */
  }
  redirect(kind === "error" ? `${path}?error=${encodeURIComponent(message)}` : `${path}?saved=1&note=${encodeURIComponent(message)}`);
}

/** datetime-local value + browser timezone offset (minutes) → ISO UTC. */
function toIso(local: string, tzOffsetMin: string) {
  if (!local) return null;
  const off = Number(tzOffsetMin || 0);
  const d = new Date(`${local}:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + off * 60_000).toISOString();
}

export async function saveSession(fd: FormData) {
  const me = await requireAdmin();
  const db = createAdminClient();
  const id = fstr(fd, "id");
  const starts = toIso(fstr(fd, "starts_local"), fstr(fd, "tz_offset"));
  const minutes = Math.max(15, Math.min(600, Number(fstr(fd, "duration_min") || 60)));
  if (!fstr(fd, "title")) return back("Title is required");
  if (!starts) return back("Choose a start date and time");
  const meeting = fstr(fd, "meeting_url");
  if (meeting && !/^https?:\/\//i.test(meeting)) return back("Meeting link must start with https://");

  const audience = (["all", "department", "selected"].includes(fstr(fd, "audience")) ? fstr(fd, "audience") : "all") as LiveSession["audience"];
  const values = {
    title: fstr(fd, "title"),
    description: fstr(fd, "description"),
    course_id: fstr(fd, "course_id") || null,
    host_name: fstr(fd, "host_name") || null,
    starts_at: starts,
    ends_at: new Date(new Date(starts).getTime() + minutes * 60_000).toISOString(),
    meeting_url: meeting || null,
    location: fstr(fd, "location") || null,
    audience,
    department_id: audience === "department" ? fstr(fd, "department_id") || null : null,
    recording_url: fstr(fd, "recording_url") || null,
    links: parseLinks(fstr(fd, "links")),
    status: (["scheduled", "cancelled", "completed"].includes(fstr(fd, "status")) ? fstr(fd, "status") : "scheduled") as LiveSession["status"],
  };
  if (audience === "department" && !values.department_id) return back("Choose the department to invite");

  let sessionId = id;
  if (id) {
    const { error } = await db.from("live_sessions").update(values).eq("id", id);
    if (error) return back(error.message);
  } else {
    const { data, error } = await db.from("live_sessions").insert({ ...values, created_by: me.id }).select("id").single();
    if (error || !data) return back(error?.message ?? "Could not create the class");
    sessionId = data.id;
  }

  // Selected attendees (by email, one per line or comma-separated)
  if (audience === "selected") {
    const emails = fstr(fd, "invitee_emails").toLowerCase().split(/[\s,;]+/).filter((e) => e.includes("@"));
    const { data: people } = emails.length
      ? await db.from("profiles").select("id, email").in("email", emails)
      : { data: [] as { id: string; email: string }[] };
    await db.from("live_session_invitees").delete().eq("session_id", sessionId);
    if (people?.length) {
      await db.from("live_session_invitees").insert(people.map((p) => ({ session_id: sessionId, user_id: p.id })));
    }
    const found = new Set((people ?? []).map((p) => p.email));
    const missing = emails.filter((e) => !found.has(e));
    revalidatePath("/admin/live");
    revalidatePath("/live");
    if (missing.length) return back(`Saved, but these people don't have accounts yet: ${missing.join(", ")}`, "saved");
  }

  revalidatePath("/admin/live");
  revalidatePath("/live");
  redirect(`/admin/live/${sessionId}?saved=1`);
}

export async function deleteSession(fd: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const id = fstr(fd, "id");
  const { data: s } = await db.from("live_sessions").select("outlook_event_id").eq("id", id).maybeSingle();
  if (s?.outlook_event_id && graphConfigured()) {
    await cancelOutlookEvent(s.outlook_event_id, "This class has been cancelled.").catch(() => undefined);
  }
  await db.from("live_sessions").delete().eq("id", id);
  revalidatePath("/admin/live");
  revalidatePath("/live");
  redirect("/admin/live?saved=1");
}

/** Microsoft 365: create/update the Outlook meeting and email invites to everyone in the audience. */
export async function sendOutlookInvites(fd: FormData) {
  await requireAdmin();
  if (!graphConfigured()) return back("Outlook isn't connected yet — see Admin → Settings → Microsoft 365.");
  const id = fstr(fd, "id");
  const db = createAdminClient();
  const { data } = await db.from("live_sessions").select("*").eq("id", id).maybeSingle();
  if (!data) return back("Class not found");
  const s = data as LiveSession;

  // Audience resolution runs as the signed-in admin (function checks is_admin()).
  const supabase = await createClient();
  const { data: audience, error: audErr } = await supabase.rpc("session_audience", { target: id });
  if (audErr) return back(audErr.message);
  const attendees = ((audience ?? []) as { email: string; full_name: string | null }[]).map((a) => ({ email: a.email, name: a.full_name }));
  if (!attendees.length) return back("No one is in this class's audience yet.");
  if (attendees.length > 450) return back("Outlook meetings are limited to about 500 attendees — split the audience by department.");

  try {
    const result = await upsertOutlookEvent(s, attendees, env.siteUrl(), { createTeamsMeeting: fd.get("create_teams") === "on" });
    await db
      .from("live_sessions")
      .update({
        outlook_event_id: result.id,
        invites_sent_at: new Date().toISOString(),
        ...(result.joinUrl && !s.meeting_url ? { meeting_url: result.joinUrl } : {}),
      })
      .eq("id", id);
  } catch (e) {
    return back(e instanceof Error ? e.message : "Outlook invite failed");
  }
  revalidatePath(`/admin/live/${id}`);
  return back(`Outlook invites sent to ${attendees.length} people.`, "saved");
}
