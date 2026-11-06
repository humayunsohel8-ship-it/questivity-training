/**
 * OPTIONAL Microsoft 365 (Outlook) integration via Microsoft Graph.
 *
 * When configured, "Send Outlook invites" creates the class as a meeting in the organiser's
 * Outlook calendar with every invited learner as an attendee — Outlook then emails real
 * meeting invites, tracks RSVPs, and (optionally) generates a Teams link.
 *
 * Setup (Microsoft Entra admin center → App registrations):
 *   1. New registration "Questivity LMS". Copy the Tenant ID and Client ID.
 *   2. Certificates & secrets → New client secret. Copy the value.
 *   3. API permissions → Microsoft Graph → Application permission "Calendars.ReadWrite" → Grant admin consent.
 *      (Recommended: restrict it to the organiser mailbox with an Exchange application access policy.)
 *   4. Set in hosting env: MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET,
 *      MS_GRAPH_ORGANIZER (e.g. training@questivity.com).
 */
import type { LiveSession } from "@/lib/live";
import { sessionDescription } from "@/lib/live";

const cfg = () => ({
  tenant: process.env.MS_GRAPH_TENANT_ID,
  clientId: process.env.MS_GRAPH_CLIENT_ID,
  secret: process.env.MS_GRAPH_CLIENT_SECRET,
  organizer: process.env.MS_GRAPH_ORGANIZER,
});

export function graphConfigured() {
  const c = cfg();
  return Boolean(c.tenant && c.clientId && c.secret && c.organizer);
}

export function graphOrganizer() {
  return cfg().organizer ?? null;
}

async function token() {
  const c = cfg();
  const res = await fetch(`https://login.microsoftonline.com/${c.tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId!,
      client_secret: c.secret!,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Microsoft sign-in failed (${res.status}). Check the MS_GRAPH_* settings.`);
  return (await res.json()).access_token as string;
}

async function graph(path: string, init: RequestInit) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Outlook rejected the request (${res.status}). ${detail.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

/**
 * Create or update the meeting in the organiser's Outlook calendar and invite attendees.
 * Returns the Outlook event id and (when a Teams meeting was created) the join URL.
 */
export async function upsertOutlookEvent(
  s: LiveSession,
  attendees: { email: string; name: string | null }[],
  siteUrl: string,
  opts: { createTeamsMeeting: boolean },
) {
  const organizer = encodeURIComponent(cfg().organizer!);
  const body = {
    subject: s.title,
    body: { contentType: "text", content: sessionDescription(s, siteUrl) },
    start: { dateTime: new Date(s.starts_at).toISOString().replace("Z", ""), timeZone: "UTC" },
    end: { dateTime: new Date(s.ends_at).toISOString().replace("Z", ""), timeZone: "UTC" },
    location: { displayName: s.meeting_url ? "Online meeting" : s.location || "Online" },
    attendees: attendees.map((a) => ({ emailAddress: { address: a.email, name: a.name ?? a.email }, type: "required" })),
    allowNewTimeProposals: false,
    responseRequested: true,
    ...(opts.createTeamsMeeting && !s.meeting_url ? { isOnlineMeeting: true, onlineMeetingProvider: "teamsForBusiness" } : {}),
  };

  const event = s.outlook_event_id
    ? await graph(`/users/${organizer}/events/${encodeURIComponent(s.outlook_event_id)}`, { method: "PATCH", body: JSON.stringify(body) })
    : await graph(`/users/${organizer}/events`, { method: "POST", body: JSON.stringify(body) });

  return { id: event.id as string, joinUrl: (event.onlineMeeting?.joinUrl as string | undefined) ?? null };
}

export async function cancelOutlookEvent(eventId: string, comment: string) {
  const organizer = encodeURIComponent(cfg().organizer!);
  await graph(`/users/${organizer}/events/${encodeURIComponent(eventId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}
