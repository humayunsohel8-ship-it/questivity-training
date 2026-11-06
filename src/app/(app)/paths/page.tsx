import Link from "next/link";
import type { Metadata } from "next";
import { Route, Sparkles } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { progressFor } from "@/lib/learning";
import { EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { minutesLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Learning paths" };

type PathRow = {
  id: string; slug: string; title: string; description: string; audience: string; is_onboarding: boolean;
  learning_path_courses: { position: number; course: { id: string; slug: string; title: string; duration_minutes: number; status: string } | null }[];
};

export default async function PathsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("learning_paths")
    .select("id, slug, title, description, audience, is_onboarding, learning_path_courses(position, course:courses(id, slug, title, duration_minutes, status))")
    .eq("status", "published")
    .order("is_onboarding", { ascending: false })
    .order("title");

  const paths = (data ?? []) as unknown as PathRow[];
  const courseIds = [...new Set(paths.flatMap((p) => p.learning_path_courses.map((c) => c.course?.id).filter(Boolean) as string[]))];
  const { totals, done } = await progressFor(supabase, profile.id, courseIds);

  return (
    <div>
      <PageHeader title="Learning paths" description="Curated sequences of courses for onboarding and for each technical track." />
      {paths.length === 0 && <EmptyState title="No learning paths yet" />}
      <div className="space-y-6">
        {paths.map((p) => {
          const courses = p.learning_path_courses
            .filter((c) => c.course && c.course.status === "published")
            .sort((a, b) => a.position - b.position)
            .map((c) => c.course!);
          const total = courses.reduce((s, c) => s + (totals.get(c.id) ?? 0), 0);
          const completed = courses.reduce((s, c) => s + (done.get(c.id) ?? 0), 0);
          const minutes = courses.reduce((s, c) => s + c.duration_minutes, 0);
          return (
            <section key={p.id} id={p.slug} className="card overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-brand-line p-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-brand bg-brand-light text-brand">
                    {p.is_onboarding ? <Sparkles className="h-5 w-5" /> : <Route className="h-5 w-5" />}
                  </span>
                  <div>
                    <h2 className="section-title">{p.title}</h2>
                    <p className="mt-1 text-sm text-brand-muted">{p.description}</p>
                    <p className="mt-2 text-xs text-brand-muted">{p.audience} · {courses.length} courses · {minutesLabel(minutes)}</p>
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <ProgressBar value={total ? (100 * completed) / total : 0} />
                  <p className="mt-1 text-right text-xs text-brand-muted">{total ? Math.round((100 * completed) / total) : 0}% complete</p>
                </div>
              </div>
              <ol className="divide-y divide-brand-line">
                {courses.map((c, i) => {
                  const t = totals.get(c.id) ?? 0;
                  const d = done.get(c.id) ?? 0;
                  return (
                    <li key={c.id}>
                      <Link href={`/courses/${c.slug}`} className="flex items-center gap-4 px-6 py-3 text-sm hover:bg-brand-light/40">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-surface text-xs font-bold text-brand ring-1 ring-brand-line">{i + 1}</span>
                        <span className="flex-1 font-medium">{c.title}</span>
                        <span className="w-24"><ProgressBar value={t ? (100 * d) / t : 0} /></span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
