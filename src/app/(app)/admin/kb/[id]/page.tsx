import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConfirmButton } from "@/components/confirm-button";
import { MarkdownEditor } from "./markdown-editor";
import { deleteArticle, saveArticle } from "../../actions";
import type { KbArticle } from "@/lib/types";

export const metadata = { title: "Admin · Edit article" };

export default async function AdminKbArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const db = createAdminClient();
  const isNew = id === "new";
  const [{ data: article }, { data: categories }, { count: chunkCount }] = await Promise.all([
    isNew ? Promise.resolve({ data: null }) : db.from("kb_articles").select("*").eq("id", id).maybeSingle(),
    db.from("kb_categories").select("id, name").order("position"),
    isNew ? Promise.resolve({ count: 0 }) : db.from("kb_chunks").select("id", { count: "exact", head: true }).eq("article_id", id),
  ]);
  if (!isNew && !article) notFound();
  const a = (article ?? {}) as Partial<KbArticle>;
  const reviewDefault = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/kb" className="text-sm text-brand hover:underline">← Knowledge base</Link>
          <h1 className="page-title mt-1">{isNew ? "New article" : a.title}</h1>
          {!isNew && <p className="text-xs text-brand-muted">Indexed for the assistant as {chunkCount ?? 0} section(s).</p>}
        </div>
        {!isNew && a.status === "published" && (
          <Link href={`/kb/${a.slug}`} target="_blank" className="btn-ghost"><ExternalLink className="h-4 w-4" /> View</Link>
        )}
      </div>

      <form action={saveArticle} className="card grid gap-4 p-6 sm:grid-cols-4">
        <input type="hidden" name="id" value={a.id ?? ""} />
        <div className="sm:col-span-3"><label className="label">Title</label><input name="title" defaultValue={a.title} className="input" required /></div>
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={a.status ?? "draft"} className="input"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select>
        </div>
        <div className="sm:col-span-4"><label className="label">Summary (one line)</label><input name="summary" defaultValue={a.summary} className="input" /></div>
        <div>
          <label className="label">Category</label>
          <select name="category_id" defaultValue={a.category_id ?? ""} className="input">
            <option value="">—</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label className="label">Owner team</label><input name="owner_team" defaultValue={a.owner_team ?? ""} className="input" /></div>
        <div><label className="label">Review by</label><input name="review_due" type="date" defaultValue={a.review_due ?? reviewDefault} className="input" /></div>
        <div><label className="label">URL slug</label><input name="slug" defaultValue={a.slug} className="input" placeholder="auto from title" /></div>
        <div className="sm:col-span-4"><label className="label">Tags (comma-separated — help search and the assistant)</label><input name="tags" defaultValue={(a.tags ?? []).join(", ")} className="input" /></div>
        <div className="sm:col-span-4">
          <MarkdownEditor name="body_md" defaultValue={a.body_md ?? ""} />
          <p className="mt-1 text-xs text-brand-muted">Tip: use ## headings for each topic — the assistant retrieves and cites content section by section.</p>
        </div>
        <div className="sm:col-span-4"><button className="btn-primary">Save article</button></div>
      </form>

      {!isNew && (
        <form action={deleteArticle} className="border-t border-brand-line pt-6">
          <input type="hidden" name="id" value={a.id} />
          <ConfirmButton message="Permanently delete this article? Consider archiving instead."><Trash2 className="h-4 w-4" /> Delete article</ConfirmButton>
        </form>
      )}
    </div>
  );
}
