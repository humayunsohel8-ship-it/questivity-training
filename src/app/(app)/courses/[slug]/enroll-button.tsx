"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { enrollAction } from "../actions";

export function EnrollButton({ courseId, slug, firstLessonId }: { courseId: string; slug: string; firstLessonId?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className="btn-primary w-full"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await enrollAction(courseId, slug);
          if (firstLessonId) router.push(`/courses/${slug}/lessons/${firstLessonId}`);
        })
      }
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />} Enrol and start
    </button>
  );
}
