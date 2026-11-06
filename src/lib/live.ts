import { brand } from "@/config/brand";
import type { SharedLink } from "@/lib/links";

export interface LiveSession {
  id: string;
  title: string;
  description: string;
  course_id: string | null;
  host_name: string | null;
  starts_at: string;
  ends_at: string;
  meeting_url: string | null;
  location: string | null;
  audience: "all" | "department" | "selected";
  department_id: string | null;
  status: "scheduled" | "cancelled" | "completed";
  recording_url: string | null;
  links: SharedLink[];
  outlook_event_id: string | null;
  invites_sent_at: string | null;
}

const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Fold long lines to 75 octets as RFC 5545 requires. */
const fold = (line: string) => {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  out.push(rest);
  return out.join("\r\n");
};

export function sessionDescription(s: LiveSession, siteUrl: string) {
  const parts = [
    s.description,
    s.meeting_url ? `Join: ${s.meeting_url}` : "",
    s.host_name ? `Host: ${s.host_name}` : "",
    ...(s.links ?? []).map((l) => `${l.title}: ${l.url}`),
    `Details in ${brand.product}: ${siteUrl}/live`,
  ];
  return parts.filter(Boolean).join("\n\n");
}

/** Calendar invite (.ics) that opens in Outlook, Google Calendar and Apple Calendar. */
export function buildIcs(s: LiveSession, siteUrl: string, method: "PUBLISH" | "CANCEL" = "PUBLISH") {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${brand.company}//${brand.product}//EN`,
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${s.id}@questivity-lms`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(s.starts_at)}`,
    `DTEND:${icsDate(s.ends_at)}`,
    `SUMMARY:${icsEscape(s.title)}`,
    `DESCRIPTION:${icsEscape(sessionDescription(s, siteUrl))}`,
    `LOCATION:${icsEscape(s.meeting_url || s.location || "Online")}`,
    s.meeting_url ? `URL:${s.meeting_url}` : "",
    `STATUS:${s.status === "cancelled" || method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(s.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Opens a pre-filled event in Outlook on the web (Microsoft 365 work accounts). */
export function outlookComposeUrl(s: LiveSession, siteUrl: string) {
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: s.title,
    startdt: new Date(s.starts_at).toISOString(),
    enddt: new Date(s.ends_at).toISOString(),
    body: sessionDescription(s, siteUrl),
    location: s.meeting_url || s.location || "Online",
  });
  return `https://outlook.office.com/calendar/0/deeplink/compose?${p.toString()}`;
}

export function formatSessionTime(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const day = start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const t = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${t(start)}–${t(end)}`;
}
