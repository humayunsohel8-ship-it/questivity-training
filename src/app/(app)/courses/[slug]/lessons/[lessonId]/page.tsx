import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadCourseOutline } from "@/lib/course-data";
import { Markdown } from "@/components/markdown";
import { LessonIcon } from "@/components/lesson-icon";
import { ProgressBar } from "@/components/ui";
import { CompleteButton } from "./complete-button";
import { Quiz } from "./quiz";
import { cn, isExternalUrl, toEmbedUrl } from "@/lib/utils";
import type { QuizQuestionPublic } from "@/lib/types";

async function mediaSrc(supabase: Awaited<ReturnType<typeof createClient>>, mediaUrl: string | null) {
  if (!mediaUrl) return null;
  if (isExternalUrl(mediaUrl)) return mediaUrl;
  const { data } = await supabase.storage.from("course-media").createSignedUrl(mediaUrl, 60 * 60 * 3);
  return data?.signedUrl ?? null;
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const { slug, lessonId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();
  const { course, modules, lessons, completed } = await loadCourseOutline(supabase, slug, profile.id);

  const index = lessons.findIndex((l) => l.id === lessonId);
  if (index === -1) notFound();
  const lesson = lessons[index];
  const prev = lessons[index - 1];
  const next = lessons[index + 1];
  const done = completed.has(lesson.id);

  // Make sure the learner is enrolled (direct links, bookmarks)
  const { data: enrollment } = await supabase.from("enrollments").select("id").eq("course_id", course.id).eq("user_id", profile.id).maybeSingle();
  if (!enrollment) {
    const { error } = await supabase.rpc("enroll_self", { p_course: course.id });
    if (error) redirect(`/courses/${slug}`);
  }

  const src = await mediaSrc(supabase, lesson.media_url);
  const embed = src && isExternalUrl(lesson.media_url ?? "") ? toEmbedUrl(src) : null;

  let questions: QuizQuestionPublic[] = [];
  let bestScore: number | null = null;
  if (lesson.kind === "quiz") {
    const [{ data: qs }, { data: attempts }] = await Promise.all([
      supabase.from("quiz_questions").select("id, lesson_id, prompt, options, position").eq("lesson_id", lesson.id).order("position").order("id"),
      supabase.from("quiz_attempts").select("score").eq("lesson_id", lesson.id).eq("user_id", profile.id).order("score", { ascending: false }).limit(1),
    ]);
    questions = (qs ?? []) as QuizQuestionPublic[];
    bestScore = attempts?.[0]?.score ?? null;
  }

  const progress = lessons.length ? (100 * completed.size) / lessons.length : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="order-2 lg:order-1">
        <div className="card sticky top-10 p-4">
          <Link href={`/courses/${course.slug}`} className="font-display text-sm font-semibold hover:text-brand">{course.title}</Link>
          <ProgressBar value={progress} className="mt-3" />
          <p className="mt-1 text-xs text-brand-muted">{completed.size} of {lessons.length} complete</p>
          <nav className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto">
            {modules.map((m) => (
              <div key={m.id}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-muted">{m.title}</p>
                <ul>
                  {m.lessons.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/courses/${course.slug}/lessons/${l.id}`}
                        className={cn("flex items-center gap-2 rounded-brand px-2 py-1.5 text-sm", l.id === lesson.id ? "bg-brand-light font-semibold text-brand-dark" : "hover:bg-brand-surface")}
                      >
                        <LessonIcon kind={l.kind} done={completed.has(l.id)} className="h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-1">{l.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <article className="order-1 min-w-0 space-y-6 lg:order-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Lesson {index + 1} of {lessons.length}</p>
          <h1 className="page-title mt-1 text-3xl">{lesson.title}</h1>
        </div>

        {lesson.kind === "video" && src && (
          <div className="aspect-video overflow-hidden rounded-brand bg-black">
            {embed ? (
              <iframe src={embed} title={lesson.title} className="h-full w-full" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            ) : (
              <video src={src} controls controlsList="nodownload" className="h-full w-full" />
            )}
          </div>
        )}

        {lesson.kind === "pdf" && src && (
          <div className="space-y-2">
            <iframe src={src} title={lesson.title} className="h-[75vh] w-full rounded-brand border border-brand-line bg-white" />
            <a href={src} target="_blank" rel="noreferrer" className="btn-ghost"><Download className="h-4 w-4" /> Open document</a>
          </div>
        )}

        {lesson.body_md && (
          <div className="card p-6 sm:p-8">
            <Markdown>{lesson.body_md}</Markdown>
          </div>
        )}

        {lesson.kind === "quiz" ? (
          <Quiz lessonId={lesson.id} slug={course.slug} questions={questions} alreadyPassed={done} bestScore={bestScore} nextHref={next ? `/courses/${course.slug}/lessons/${next.id}` : `/courses/${course.slug}`} />
        ) : (
          <div className="flex justify-end">
            <CompleteButton lessonId={lesson.id} slug={course.slug} done={done} nextHref={next ? `/courses/${course.slug}/lessons/${next.id}` : `/courses/${course.slug}`} />
          </div>
        )}

        <div className="flex items-center justify-between border-t border-brand-line pt-6">
          {prev ? (
            <Link href={`/courses/${course.slug}/lessons/${prev.id}`} className="btn-ghost"><ChevronLeft className="h-4 w-4" /> Previous</Link>
          ) : <span />}
          {next && (
            <Link href={`/courses/${course.slug}/lessons/${next.id}`} className="btn-ghost">Next <ChevronRight className="h-4 w-4" /></Link>
          )}
        </div>
      </article>
    </div>
  );
}
