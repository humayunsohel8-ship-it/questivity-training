import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { MediaLibrary } from "./media-library";

export const metadata = { title: "Admin · Media library" };

export default async function AdminMediaPage() {
  await requireAdmin();
  const db = createAdminClient();
  const { data: files } = await db.storage.from("course-media").list("library", { limit: 500, sortBy: { column: "created_at", order: "desc" } });
  const items = (files ?? [])
    .filter((f) => f.name && f.id)
    .map((f) => ({
      name: f.name,
      path: `library/${f.name}`,
      size: (f.metadata as { size?: number } | null)?.size ?? 0,
      type: (f.metadata as { mimetype?: string } | null)?.mimetype ?? "",
      created_at: f.created_at ?? "",
    }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Media library"
        description="Upload training videos, PDFs and images once, then use them in any lesson. Files are private — only signed-in employees can view them, through expiring links."
      />
      <MediaLibrary items={items} />
    </div>
  );
}
