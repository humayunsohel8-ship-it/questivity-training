"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { completeLessonAction } from "../../../actions";

export function CompleteButton({ lessonId, slug, done, nextHref }: { lessonId: string; slug: string; done: boolean; nextHref: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  if (done) {
    return (
      <button className="btn-ghost" onClick={() => router.push(nextHref)}>
        <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Completed — continue
      </button>
    );
  }
  return (
    <button
      className="btn-primary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await completeLessonAction(lessonId, slug);
          router.push(nextHref);
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
      Mark complete & continue
    </button>
  );
}
