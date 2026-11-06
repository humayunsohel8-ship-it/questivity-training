import Link from "next/link";
import { Clock, ShieldCheck } from "lucide-react";
import { LevelPill, ProgressBar, StatusBadge } from "@/components/ui";
import { formatDate, isOverdue, minutesLabel } from "@/lib/utils";

export function CourseCard({
  course, progress, status, due,
}: {
  course: { slug: string; title: string; summary: string; category: string; level: string; duration_minutes: number; is_mandatory: boolean };
  progress?: number;
  status?: string;
  due?: string | null;
}) {
  const overdue = status ? isOverdue(due ?? null, status) : false;
  return (
    <Link href={`/courses/${course.slug}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="h-1.5 bg-gradient-to-r from-brand to-brand-accent" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">{course.category}</span>
          {course.is_mandatory && (
            <span className="badge gap-1 bg-brand-accent/10 text-brand-accent"><ShieldCheck className="h-3 w-3" /> Mandatory</span>
          )}
        </div>
        <h3 className="font-display text-base font-semibold leading-snug group-hover:text-brand">{course.title}</h3>
        <p className="line-clamp-2 text-sm text-brand-muted">{course.summary}</p>
        <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-brand-muted">
          <LevelPill level={course.level} />
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{minutesLabel(course.duration_minutes)}</span>
        </div>
        {progress !== undefined && status && (
          <div className="space-y-2 border-t border-brand-line pt-3">
            <div className="flex items-center justify-between text-xs">
              <StatusBadge status={overdue ? "overdue" : status} />
              <span className="text-brand-muted">{due ? `Due ${formatDate(due)}` : `${Math.round(progress)}%`}</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        )}
      </div>
    </Link>
  );
}
