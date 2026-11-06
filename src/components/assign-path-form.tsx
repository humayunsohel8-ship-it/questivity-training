"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { assignPathAction, type AssignState } from "@/app/(app)/team/actions";

export function AssignPathForm({ userId, paths }: { userId: string; paths: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<AssignState, FormData>(assignPathAction, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <select name="path_id" className="input w-auto py-1.5" required defaultValue="">
        <option value="" disabled>Assign path…</option>
        {paths.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
      </select>
      <input type="date" name="due" className="input w-auto py-1.5" title="Due date (optional)" />
      <button className="btn-ghost py-1.5" disabled={pending}>{pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Assign</button>
      {state.message && <span className="text-xs text-emerald-700">{state.message}</span>}
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
