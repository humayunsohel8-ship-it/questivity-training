import { FileText, PlayCircle, FileType2, ListChecks, CheckCircle2 } from "lucide-react";
import type { LessonKind } from "@/lib/types";

export function LessonIcon({ kind, done, className = "h-4 w-4" }: { kind: LessonKind; done?: boolean; className?: string }) {
  if (done) return <CheckCircle2 className={`${className} text-emerald-500`} />;
  const Icon = { article: FileText, video: PlayCircle, pdf: FileType2, quiz: ListChecks }[kind];
  return <Icon className={`${className} text-brand-muted`} />;
}
