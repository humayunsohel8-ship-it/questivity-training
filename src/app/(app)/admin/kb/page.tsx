import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatusBadge } from "@/components/ui";
import { saveCategory } from "../actions";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Admin · Knowledge base" };

export default async function AdminKbPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "" } = await searchParams;
  await requireAdmin();
  const db = createAdminClient();
  let q = db.from("kb_articles").select("id, slug, title, status, owner_team, review_due, views, updated_at, kb_categories(name)").order("updated_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const [{ data: articles }, { data: categories }] = await Promise.all([q, db.from("kb_categories").select("*").order("position")]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Knowledge base"
        description="Only PUBLISHED articles are visible to employees and used by the assistant. Every save re-indexes the article for the assistant automatically."
        actions={<Link href="/admin/kb/new" className="btn-primary">+ New article</Link>}
      />

      <div className="flex gap-2 text-sm">
        {["", "published", "draft", "archived"].map((s) => (
          <Link key={s || "all"} href={s ? `/admin/kb?status=${s}` : "/admin/kb"} className={`badge px-3 py-1 ${status === s ? "bg-brand text-white" : "bg-white text-brand-muted ring-1 ring-brand-line"}`}>
            {s || "All"}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-surface text-left text-xs uppercase tracking-wide text-brand-muted">
            <tr><th className="px-5 py-3">Title</th><th className="px-3">Category</th><th className="px-3">Owner</th><th className="px-3">Status</th><th className="px-3 text-right">Views</th><th className="px-3">Review due</th><th className="px-5">Updated</th></tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {(articles ?? []).map((a) => (
              <tr key={a.id} className="hover:bg-brand-surface/60">
                <td className="px-5 py-3"><Link href={`/admin/kb/${a.id}`} className="font-medium hover:text-brand">{a.title}</Link></td>
                <td className="px-3">{(a.kb_categories as unknown as { name: string } | null)?.name ?? "—"}</td>
                <td className="px-3">{a.owner_team ?? "—"}</td>
                <td className="px-3"><StatusBadge status={a.status} /></td>
                <td className="px-3 text-right">{a.views}</td>
                <td className={`px-3 ${a.review_due && a.review_due < today ? "font-semibold text-red-600" : ""}`}>{formatDate(a.review_due)}</td>
                <td className="px-5 text-brand-muted">{formatDate(a.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card p-6">
        <h2 className="section-title mb-4">Categories</h2>
        <div className="space-y-2">
          {[...(categories ?? []), null].map((c) => (
            <form key={c?.id ?? "new"} action={saveCategory} className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={c?.id ?? ""} />
              <input name="position" type="number" defaultValue={c?.position ?? (categories?.length ?? 0) + 1} className="input w-16" />
              <input name="name" defaultValue={c?.name} placeholder="New category name" className="input w-56" required />
              <input name="description" defaultValue={c?.description} placeholder="Description" className="input flex-1" />
              <button className="btn-ghost">{c ? "Save" : "Add"}</button>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
