import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, Pencil } from "lucide-react";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Markdown } from "@/components/markdown";
import { StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { brand } from "@/config/brand";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("kb_articles").select("title").eq("slug", slug).maybeSingle();
  return { title: data?.title ?? "Article" };
}

export default async function KbArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const profile = await getProfile();

  const { data: a } = await supabase
    .from("kb_articles")
    .select("*, kb_categories(slug, name)")
    .eq("slug", slug)
    .maybeSingle();
  if (!a) notFound();

  await supabase.rpc("increment_kb_view", { p_slug: slug });

  const cat = a.kb_categories as { slug: string; name: string } | null;
  const { data: related } = a.category_id
    ? await supabase
        .from("kb_articles")
        .select("slug, title")
        .eq("status", "published")
        .eq("category_id", a.category_id)
        .neq("id", a.id)
        .limit(5)
    : { data: [] as { slug: string; title: string }[] };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
      <article className="min-w-0">
        <Link href={cat ? `/kb?c=${cat.slug}` : "/kb"} className="text-sm text-brand hover:underline">← {cat?.name ?? "Knowledge base"}</Link>
        <div className="mt-3 flex items-center gap-2">
          <h1 className="page-title text-3xl">{a.title}</h1>
          {a.status !== "published" && <StatusBadge status={a.status} />}
        </div>
        {a.summary && <p className="mt-2 text-brand-muted">{a.summary}</p>}
        <p className="mt-3 text-xs text-brand-muted">
          Updated {formatDate(a.updated_at)}{a.owner_team && <> · Owner: {a.owner_team}</>}
        </p>
        <div className="card mt-6 p-6 sm:p-8">
          <Markdown>{a.body_md}</Markdown>
        </div>
      </article>

      <aside className="space-y-4 lg:sticky lg:top-10 lg:self-start">
        <div className="card p-5">
          <p className="text-sm font-semibold">Still have a question?</p>
          <p className="mt-1 text-sm text-brand-muted">{brand.assistantName} can answer follow-ups using the whole knowledge base.</p>
          <Link href={`/assistant?q=${encodeURIComponent(`About "${a.title}": `)}`} className="btn-primary mt-3 w-full"><Bot className="h-4 w-4" /> Ask a follow-up</Link>
        </div>
        {(a.tags as string[]).length > 0 && (
          <div className="card p-5">
            <p className="label">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {(a.tags as string[]).map((t) => (
                <Link key={t} href={`/kb?q=${encodeURIComponent(t)}`} className="badge bg-brand-surface text-brand-muted ring-1 ring-brand-line hover:text-brand">{t}</Link>
              ))}
            </div>
          </div>
        )}
        {related && related.length > 0 && (
          <div className="card p-5">
            <p className="label">Related</p>
            <ul className="space-y-2 text-sm">
              {related.map((r) => (
                <li key={r.slug}><Link href={`/kb/${r.slug}`} className="hover:text-brand">{r.title}</Link></li>
              ))}
            </ul>
          </div>
        )}
        {profile?.role === "admin" && (
          <Link href={`/admin/kb/${a.id}`} className="btn-ghost w-full"><Pencil className="h-4 w-4" /> Edit article</Link>
        )}
      </aside>
    </div>
  );
}
