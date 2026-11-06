"use client";

import { useActionState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import { bulkImportUsers, type ImportState } from "./import-actions";

export function BulkImport() {
  const [state, action, pending] = useActionState<ImportState, FormData>(bulkImportUsers, {});
  const created = state.results?.filter((r) => r.status === "created") ?? [];

  const downloadCsv = () => {
    const rows = [["Name", "Email (user ID)", "Temporary password"], ...created.map((r) => [r.name, r.email, r.password ?? ""])];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = "questivity-lms-new-accounts.csv";
    a.click();
  };

  return (
    <details className="card p-5">
      <summary className="cursor-pointer font-bold text-brand">Bulk import users</summary>
      <form action={action} className="mt-4 space-y-3">
        <p className="text-sm text-brand-muted">
          One person per line: <code className="rounded bg-brand-surface px-1">Full name, email, role, department</code> (role and department optional; role is learner / manager / admin). You can paste straight from Excel.
          Each new user gets a random temporary password and must change it at first sign-in.
        </p>
        <textarea name="rows" rows={6} className="input font-mono text-xs" placeholder={"Asha Rao, asha.rao@questivity.com, learner, Network Engineering\nJohn Mathew, john.m@questivity.com, manager, Service Desk"} required />
        <button className="btn-primary" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import</button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </form>

      {state.results && (
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold">
              {created.length} created · {state.results.filter((r) => r.status === "skipped").length} skipped · {state.results.filter((r) => r.status === "error").length} errors
            </p>
            {created.length > 0 && <button type="button" onClick={downloadCsv} className="btn-ghost py-1.5"><Download className="h-4 w-4" /> Download passwords (CSV)</button>}
          </div>
          <p className="rounded-brand bg-amber-50 p-3 text-xs text-amber-800">
            Temporary passwords are shown only now. Download or copy them, share each one privately, then delete the file.
          </p>
          <div className="overflow-x-auto rounded-brand border border-brand-line">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-brand-line">
                {state.results.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3">{r.email}</td>
                    <td className="px-3 font-mono">{r.password ?? ""}</td>
                    <td className={`px-3 ${r.status === "created" ? "text-emerald-700" : r.status === "skipped" ? "text-brand-muted" : "text-red-600"}`}>{r.status}{r.note ? ` — ${r.note}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </details>
  );
}
