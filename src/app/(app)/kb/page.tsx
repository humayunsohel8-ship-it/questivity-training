import Link from "next/link";
import type { Metadata } from "next";
import { Bot, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Knowledge base" };

export default async function KbPage({ searchParams }: { searchParams: Promise<{ q?: string; c?: string }> }) {
  const { q = "", c = "" } = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase.from("kb_categories").select("id, slug, name, description").order("position");
  const category = categories?.find((x) => x.slug === c);

  let query = supabase
    .from("kb_articles")
    .select("slug, title, summary, tags, updated_at, kb_categories(name)")
    .eq("status", "published");
  if (category) query = query.eq("category_id", category.id);
  if (q) query = query.textSearch("search", q, { type: "websearch", config: "english" });
  else query = query.order("title");
  const { data: articles } = await query.limit(100);

  return (
    <div>
      <PageHeader
        title="Knowledge base"
        description="Processes, runbooks, policies and everything you need to know at Questivity."
        actions={<Link href={q ? `/assistant?q=${encodeURIComponent(q)}` : "/assistant"} className="btn-ghost"><Bot className="h-4 w-4" /> Ask {brand.assistantName}</Link>}
      />

      <form className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
          <input name="q" defaultValue={q} placeholder='Search e.g. "snapshot", "firewall rule", "P1"…' className="input pl-9" />
        </div>
        {c && <input type="hidden" name="c" value={c} />}
        <button className="btn-primary">Search</button>
      </form>

      <div className="mb-8 flex flex-wrap gap-2">
        {[{ slug: "", name: "All" }, ...(categories ?? [])].map((cat) => (
          <Link
            key={cat.slug || "all"}
            href={{ pathname: "/kb", query: { ...(q && { q }), ...(cat.slug && { c: cat.slug }) } }}
            className={cn("badge px-3 py-1 text-sm", c === cat.slug ? "bg-brand text-white" : "bg-white text-brand-muted ring-1 ring-brand-line hover:text-brand")}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {articles?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {articles.map((a) => (
            <Link key={a.slug} href={`/kb/${a.slug}`} className="card group p-5 transition hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                {(a.kb_categories as unknown as { name: string } | null)?.name ?? "General"}
              </p>
              <h2 className="mt-1 font-display font-semibold group-hover:text-brand">{a.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-brand-muted">{a.summary}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {(a.tags as string[]).slice(0, 4).map((t) => (
                  <span key={t} className="badge bg-brand-surface text-brand-muted ring-1 ring-brand-line">{t}</span>
                ))}
                <span className="ml-auto text-xs text-brand-muted">Updated {formatDate(a.updated_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title={q ? `No articles match “${q}”` : "No articles yet"}
          body={q ? `Try different words, or ask ${brand.assistantName} — unanswered questions are flagged to the knowledge-base team.` : undefined}
          href={q ? `/assistant?q=${encodeURIComponent(q)}` : undefined}
          cta={q ? `Ask ${brand.assistantName}` : undefined}
        />
      )}
    </div>
  );
}
