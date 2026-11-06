"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, FileType2, Film, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteMedia } from "./actions";

type Item = { name: string; path: string; size: number; type: string; created_at: string };

const fmtSize = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

export function MediaLibrary({ items }: { items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function upload(files: FileList) {
    setError(null);
    for (const file of Array.from(files)) {
      setBusy(`Uploading ${file.name}…`);
      const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      const { error } = await createClient().storage.from("course-media").upload(`library/${Date.now()}-${safe}`, file, { contentType: file.type });
      if (error) {
        setError(`${file.name}: ${error.message}`);
        break;
      }
    }
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <label className="card flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed border-brand/40 p-10 text-center hover:bg-brand-light/40">
        {busy ? <Loader2 className="h-8 w-8 animate-spin text-brand" /> : <Upload className="h-8 w-8 text-brand" />}
        <span className="font-bold">{busy ?? "Upload videos, PDFs or images"}</span>
        <span className="text-sm text-brand-muted">MP4 / WebM / PDF / PNG / JPG · up to 500 MB per file</span>
        <input type="file" multiple accept="video/*,application/pdf,image/*" className="sr-only" disabled={!!busy} onChange={(e) => e.target.files?.length && upload(e.target.files)} />
      </label>
      {error && <p className="rounded-brand bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-surface text-left text-xs uppercase tracking-wide text-brand-muted">
            <tr><th className="px-5 py-3">File</th><th className="px-3">Size</th><th className="px-3">Use in a lesson</th><th className="px-5" /></tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {items.map((it) => {
              const Icon = it.type.startsWith("video") ? Film : it.type.startsWith("image") ? ImageIcon : FileType2;
              return (
                <tr key={it.path}>
                  <td className="px-5 py-3"><span className="flex items-center gap-2"><Icon className="h-4 w-4 text-brand" />{it.name.replace(/^\d+-/, "")}</span></td>
                  <td className="px-3 text-brand-muted">{fmtSize(it.size)}</td>
                  <td className="px-3">
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(it.path); setCopied(it.path); setTimeout(() => setCopied(null), 1500); }}
                      className="inline-flex items-center gap-1 rounded border border-brand-line px-2 py-1 font-mono text-xs hover:border-brand"
                      title="Copy, then paste into a lesson's Video / document field"
                    >
                      {copied === it.path ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />} {it.path}
                    </button>
                  </td>
                  <td className="px-5 text-right">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => confirm(`Delete ${it.name}? Lessons using it will stop showing it.`) && start(async () => { await deleteMedia(it.path); router.refresh(); })}
                      className="text-red-600 hover:underline"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!items.length && <tr><td colSpan={4} className="px-5 py-8 text-center text-brand-muted">No files yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-brand-muted">Tip: to add a video lesson, open a course → Add lesson (type Video) → paste the copied path into &quot;Video / document&quot;. YouTube, Vimeo and Microsoft Stream/SharePoint links also work.</p>
    </div>
  );
}
