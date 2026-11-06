"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { changePassword, type PasswordChangeState } from "@/app/(app)/account/actions";

export function PasswordForm({ submitLabel = "Update password", onDoneHref }: { submitLabel?: string; onDoneHref?: string }) {
  const [state, action, pending] = useActionState<PasswordChangeState, FormData>(changePassword, {});

  if (state.ok) {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 rounded-brand bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Password updated.
        </p>
        {onDoneHref && <a href={onDoneHref} className="btn-primary">Continue</a>}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="new-password">New password</label>
        <input id="new-password" name="password" type="password" autoComplete="new-password" className="input" required minLength={10} />
        <p className="mt-1 text-xs text-brand-muted">At least 10 characters, with letters and numbers.</p>
      </div>
      <div>
        <label className="label" htmlFor="confirm-password">Confirm new password</label>
        <input id="confirm-password" name="confirm" type="password" autoComplete="new-password" className="input" required minLength={10} />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} {submitLabel}
      </button>
    </form>
  );
}
