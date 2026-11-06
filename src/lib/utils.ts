export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function minutesLabel(min: number) {
  if (!min) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function isOverdue(due: string | null, status: string) {
  if (!due || status === "completed") return false;
  return new Date(due) < new Date(new Date().toDateString());
}

/** Read a trimmed string from FormData. */
export function fstr(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function fint(fd: FormData, key: string, fallback = 0) {
  const n = Number(fstr(fd, key));
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

/** YouTube / Vimeo / SharePoint (Stream) links → embeddable URL, else null. */
export function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed${u.pathname}`;
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (u.hostname.endsWith("sharepoint.com") || u.hostname.endsWith("microsoftstream.com")) return url;
    return null;
  } catch {
    return null;
  }
}

export const isExternalUrl = (v: string) => /^https?:\/\//i.test(v);
