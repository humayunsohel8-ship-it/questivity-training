import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Bot, BookOpenText } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getEnrollments } from "@/lib/learning";
import { CourseCard } from "@/components/course-card";
import { EmptyState, StatCard } from "@/components/ui";
import { isOverdue, formatDate } from "@/lib/utils";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "My learning" };

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [enrollments, { data: recentKb }, { count: certCount }] = await Promise.all([
    getEnrollments(supabase, profile.id),
    supabase.from("kb_articles").select("slug, title, summary, updated_at").eq("status", "published").order("updated_at", { ascending: false }).limit(5),
    supabase.from("certificates").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
  ]);

  const active = enrollments.filter((e) => e.status !== "completed");
  const completed = enrollments.filter((e) => e.status === "completed");
  const overdue = active.filter((e) => isOverdue(e.due_date, e.status));
  const next = active.find((e) => e.status === "in_progress") ?? active[0];
  const firstName = (profile.full_name || profile.email).split(" ")[0];

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-brand bg-brand-dark p-6 text-white sm:p-8">
        <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-accent/30 blur-3xl" />
        <p className="text-sm text-white/70">Welcome back</p>
        <h1 className="mt-1 font-display text-3xl font-bold">Hi {firstName} 👋</h1>
        {next ? (
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-white/85">
              Continue <span className="font-semibold text-white">{next.course.title}</span>
              {next.due_date && <> · due {formatDate(next.due_date)}</>}
            </p>
            <Link href={`/courses/${next.course.slug}`} className="btn-accent">
              Continue learning <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <p className="mt-4 text-white/85">You&apos;re all caught up. Explore the catalog to keep growing.</p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="In progress" value={active.length} />
        <StatCard label="Overdue" value={overdue.length} tone={overdue.length ? "warn" : "default"} />
        <StatCard label="Completed" value={completed.length} tone="good" />
        <StatCard label="Certificates" value={certCount ?? 0} />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">Assigned to me</h2>
          <Link href="/courses" className="text-sm font-semibold text-brand hover:underline">Browse catalog</Link>
        </div>
        {active.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((e) => (
              <CourseCard key={e.id} course={e.course} progress={e.progress} status={e.status} due={e.due_date} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing assigned right now" body="Pick a course or learning path to keep building your skills." href="/paths" cta="Explore learning paths" />
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <BookOpenText className="h-5 w-5 text-brand" />
            <h2 className="section-title">Recently updated in the knowledge base</h2>
          </div>
          <ul className="divide-y divide-brand-line">
            {(recentKb ?? []).map((a) => (
              <li key={a.slug} className="py-3">
                <Link href={`/kb/${a.slug}`} className="font-medium hover:text-brand">{a.title}</Link>
                <p className="line-clamp-1 text-sm text-brand-muted">{a.summary}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="card flex flex-col justify-between gap-4 bg-gradient-to-br from-brand-light to-white p-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Bot className="h-5 w-5 text-brand" />
              <h2 className="section-title">Ask {brand.assistantName}</h2>
            </div>
            <p className="text-sm text-brand-muted">
              Get instant answers from our knowledge base — processes, runbooks, policies — with links to the source.
            </p>
          </div>
          <Link href="/assistant" className="btn-primary self-start">Ask a question</Link>
        </div>
      </section>

      {completed.length > 0 && (
        <section>
          <h2 className="section-title mb-4">Completed</h2>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {completed.map((e) => (
              <CourseCard key={e.id} course={e.course} progress={100} status="completed" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
