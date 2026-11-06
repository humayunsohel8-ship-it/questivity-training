import Link from "next/link";
import { Award, Clock, ShieldCheck } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadCourseOutline } from "@/lib/course-data";
import { Markdown } from "@/components/markdown";
import { LessonIcon } from "@/components/lesson-icon";
import { LevelPill, ProgressBar, StatusBadge } from "@/components/ui";
import { EnrollButton } from "./enroll-button";
import { formatDate, isOverdue, minutesLabel } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("title").eq("slug", slug).maybeSingle();
  return { title: data?.title ?? "Course" };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();
  const { course, modules, lessons, completed } = await loadCourseOutline(supabase, slug, profile.id);

  const [{ data: enrollment }, { data: cert }] = await Promise.all([
    supabase.from("enrollments").select("*").eq("course_id", course.id).eq("user_id", profile.id).maybeSingle(),
    supabase.from("certificates").select("id").eq("course_id", course.id).eq("user_id", profile.id).maybeSingle(),
  ]);

  const progress = lessons.length ? (100 * completed.size) / lessons.length : 0;
  const nextLesson = lessons.find((l) => !completed.has(l.id)) ?? lessons[0];
  const overdue = enrollment ? isOverdue(enrollment.due_date, enrollment.status) : false;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <div>
          <Link href="/courses" className="text-sm text-brand hover:underline">← Course catalog</Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand">{course.category}</span>
            <LevelPill level={course.level} />
            {course.is_mandatory && <span className="badge gap-1 bg-brand-accent/10 text-brand-accent"><ShieldCheck className="h-3 w-3" /> Mandatory</span>}
            {course.status !== "published" && <StatusBadge status={course.status} />}
          </div>
          <h1 className="page-title mt-2 text-3xl">{course.title}</h1>
          <p className="mt-2 text-brand-muted">{course.summary}</p>
        </div>

        {course.description_md && <Markdown>{course.description_md}</Markdown>}

        <div className="space-y-4">
          <h2 className="section-title">Course content</h2>
          {modules.map((m, i) => (
            <div key={m.id} className="card overflow-hidden">
              <div className="border-b border-brand-line bg-brand-surface px-5 py-3 text-sm font-semibold">
                Module {i + 1} · {m.title}
              </div>
              <ul className="divide-y divide-brand-line">
                {m.lessons.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={enrollment ? `/courses/${course.slug}/lessons/${l.id}` : "#enrol"}
                      className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-brand-light/40"
                    >
                      <LessonIcon kind={l.kind} done={completed.has(l.id)} />
                      <span className="flex-1">{l.title}</span>
                      <span className="text-xs text-brand-muted">{l.kind === "quiz" ? "Quiz" : minutesLabel(l.duration_minutes)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <aside id="enrol" className="lg:sticky lg:top-10 lg:self-start">
        <div className="card space-y-5 p-6">
          <div className="flex items-center gap-2 text-sm text-brand-muted">
            <Clock className="h-4 w-4" /> {minutesLabel(course.duration_minutes)} · {lessons.length} lessons
          </div>

          {enrollment ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <StatusBadge status={overdue ? "overdue" : enrollment.status} />
                  <span className="font-semibold">{Math.round(progress)}%</span>
                </div>
                <ProgressBar value={progress} />
                {enrollment.due_date && <p className="text-xs text-brand-muted">Due {formatDate(enrollment.due_date)}</p>}
              </div>
              {nextLesson && enrollment.status !== "completed" && (
                <Link href={`/courses/${course.slug}/lessons/${nextLesson.id}`} className="btn-primary w-full">
                  {completed.size ? "Continue" : "Start course"}
                </Link>
              )}
              {cert && (
                <Link href={`/certificates/${cert.id}`} className="btn-accent w-full">
                  <Award className="h-4 w-4" /> View certificate
                </Link>
              )}
            </>
          ) : (
            <EnrollButton courseId={course.id} slug={course.slug} firstLessonId={lessons[0]?.id} />
          )}
          <p className="text-xs text-brand-muted">Complete every lesson and pass the quiz to earn a certificate.</p>
        </div>
      </aside>
    </div>
  );
}
