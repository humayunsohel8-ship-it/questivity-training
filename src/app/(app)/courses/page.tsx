import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { progressFor } from "@/lib/learning";
import { CourseCard } from "@/components/course-card";
import { EmptyState, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Course } from "@/lib/types";

export const metadata: Metadata = { title: "Course catalog" };

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q = "", category = "" } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();

  let query = supabase.from("courses").select("*").eq("status", "published").order("is_mandatory", { ascending: false }).order("title");
  if (category) query = query.eq("category", category);
  if (q) query = query.or(`title.ilike.%${q.replace(/[%,()]/g, "")}%,summary.ilike.%${q.replace(/[%,()]/g, "")}%`);

  const [{ data: courses }, { data: allCats }, { data: enrollments }] = await Promise.all([
    query,
    supabase.from("courses").select("category").eq("status", "published"),
    supabase.from("enrollments").select("course_id, status, due_date").eq("user_id", profile.id),
  ]);

  const list = (courses ?? []) as Course[];
  const categories = [...new Set((allCats ?? []).map((c) => c.category as string))].sort();
  const byCourse = new Map((enrollments ?? []).map((e) => [e.course_id as string, e]));
  const { totals, done } = await progressFor(supabase, profile.id, [...byCourse.keys()]);

  return (
    <div>
      <PageHeader title="Course catalog" description="Every published course at Questivity. Enrol in anything that helps you grow." />

      <form className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
          <input name="q" defaultValue={q} placeholder="Search courses…" className="input pl-9" />
        </div>
        {category && <input type="hidden" name="category" value={category} />}
        <button className="btn-primary">Search</button>
      </form>

      <div className="mb-8 flex flex-wrap gap-2">
        {["", ...categories].map((c) => (
          <Link
            key={c || "all"}
            href={{ pathname: "/courses", query: { ...(q && { q }), ...(c && { category: c }) } }}
            className={cn("badge px-3 py-1 text-sm", category === c ? "bg-brand text-white" : "bg-white text-brand-muted ring-1 ring-brand-line hover:text-brand")}
          >
            {c || "All"}
          </Link>
        ))}
      </div>

      {list.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const e = byCourse.get(c.id);
            const total = totals.get(c.id) ?? 0;
            const pct = e?.status === "completed" ? 100 : total ? (100 * (done.get(c.id) ?? 0)) / total : 0;
            return <CourseCard key={c.id} course={c} progress={e ? pct : undefined} status={e?.status} due={e?.due_date} />;
          })}
        </div>
      ) : (
        <EmptyState title="No courses found" body="Try a different search or category." />
      )}
    </div>
  );
}
