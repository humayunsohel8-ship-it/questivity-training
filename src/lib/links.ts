export interface SharedLink {
  title: string;
  url: string;
}

/**
 * Parse links typed one per line as "Title | https://url" (or just a URL).
 * Only http(s) links are kept.
 */
export function parseLinks(text: string): SharedLink[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [a, b] = line.includes("|") ? line.split("|").map((s) => s.trim()) : [line, line];
      const url = (b || a).trim();
      const title = (b ? a : url).trim() || url;
      return { title, url };
    })
    .filter((l) => /^https?:\/\/\S+$/i.test(l.url))
    .slice(0, 30);
}

export function linksToText(links: SharedLink[] | null | undefined) {
  return (links ?? []).map((l) => (l.title && l.title !== l.url ? `${l.title} | ${l.url}` : l.url)).join("\n");
}
