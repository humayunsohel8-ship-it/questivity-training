"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";
import { submitQuizAction } from "../../../actions";
import { cn } from "@/lib/utils";
import type { QuizQuestionPublic, QuizResult } from "@/lib/types";

export function Quiz({
  lessonId, slug, questions, alreadyPassed, bestScore, nextHref,
}: {
  lessonId: string;
  slug: string;
  questions: QuizQuestionPublic[];
  alreadyPassed: boolean;
  bestScore: number | null;
  nextHref: string;
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!questions.length) return <p className="card p-6 text-sm text-brand-muted">This quiz has no questions yet.</p>;

  const answeredAll = answers.every((a) => a !== null);
  const byId = new Map(result?.results.map((r) => [r.question_id, r]));

  const submit = () =>
    start(async () => {
      setError(null);
      try {
        setResult(await submitQuizAction(lessonId, slug, answers));
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        setError("Something went wrong submitting your answers. Please try again.");
      }
    });

  return (
    <div className="space-y-6">
      {alreadyPassed && !result && (
        <p className="rounded-brand bg-emerald-50 p-4 text-sm text-emerald-800">
          You&apos;ve already passed this quiz{bestScore !== null && ` (best score ${bestScore}%)`}. You can retake it for practice.
        </p>
      )}

      {result && (
        <div className={cn("card flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between", result.passed ? "border-emerald-300" : "border-red-300")}>
          <div>
            <p className="font-display text-2xl font-bold">{result.score}%</p>
            <p className="text-sm text-brand-muted">
              {result.correct} of {result.total} correct · pass mark {result.pass_mark}% ·{" "}
              {result.passed ? <span className="font-semibold text-emerald-700">Passed</span> : <span className="font-semibold text-red-700">Not passed yet</span>}
            </p>
          </div>
          {result.passed ? (
            <Link href={nextHref} className="btn-primary">Continue</Link>
          ) : (
            <button className="btn-ghost" onClick={() => { setResult(null); setAnswers(questions.map(() => null)); }}>
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
          )}
        </div>
      )}

      {questions.map((q, qi) => {
        const r = byId.get(q.id);
        return (
          <fieldset key={q.id} className="card p-6" disabled={!!result}>
            <legend className="sr-only">Question {qi + 1}</legend>
            <p className="mb-4 font-semibold">
              <span className="mr-2 text-brand">{qi + 1}.</span>{q.prompt}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const selected = answers[qi] === oi;
                const isCorrect = r?.correct_index === oi;
                const isWrongPick = r && selected && !r.correct;
                return (
                  <label
                    key={oi}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-brand border px-4 py-3 text-sm transition",
                      selected ? "border-brand bg-brand-light/50" : "border-brand-line hover:bg-brand-surface",
                      isCorrect && "border-emerald-400 bg-emerald-50",
                      isWrongPick && "border-red-400 bg-red-50",
                    )}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      className="accent-[rgb(var(--brand-primary))]"
                      checked={selected}
                      onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                    />
                    <span className="flex-1">{opt}</span>
                    {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    {isWrongPick && <XCircle className="h-4 w-4 text-red-600" />}
                  </label>
                );
              })}
            </div>
            {r && (
              <p className={cn("mt-3 text-sm", r.correct ? "text-emerald-700" : "text-red-700")}>
                {r.correct ? "Correct. " : "Not quite. "}
                {(result?.passed || r.correct) && <span className="text-brand-ink">{r.explanation}</span>}
              </p>
            )}
          </fieldset>
        );
      })}

      {!result && (
        <div className="flex items-center justify-end gap-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary" onClick={submit} disabled={!answeredAll || pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Submit answers
          </button>
        </div>
      )}
    </div>
  );
}
