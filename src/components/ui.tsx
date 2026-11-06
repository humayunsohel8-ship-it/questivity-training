import Link from "next/link";
import { cn } from "@/lib/utils";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-brand-line", className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-emerald-500" : "bg-brand")} style={{ width: `${pct}%` }} />
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700",
  in_progress: "bg-brand-light text-brand-dark",
  assigned: "bg-amber-50 text-amber-700",
  overdue: "bg-red-50 text-red-700",
  published: "bg-emerald-50 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  archived: "bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  in_progress: "In progress",
  assigned: "Not started",
  overdue: "Overdue",
  published: "Published",
  draft: "Draft",
  archived: "Archived",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={cn("badge", STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600")}>{STATUS_LABELS[status] ?? status}</span>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-brand-muted">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "default" }: { label: string; value: string | number; hint?: string; tone?: "default" | "warn" | "good" }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
      <p className={cn("mt-2 font-display text-3xl font-bold", tone === "warn" ? "text-red-600" : tone === "good" ? "text-emerald-600" : "text-brand-ink")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-brand-muted">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, body, href, cta }: { title: string; body?: string; href?: string; cta?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-10 text-center">
      <p className="font-semibold">{title}</p>
      {body && <p className="max-w-md text-sm text-brand-muted">{body}</p>}
      {href && cta && <Link href={href} className="btn-primary mt-3">{cta}</Link>}
    </div>
  );
}

export function LevelPill({ level }: { level: string }) {
  return <span className="badge bg-brand-surface text-brand-muted ring-1 ring-brand-line">{level}</span>;
}
