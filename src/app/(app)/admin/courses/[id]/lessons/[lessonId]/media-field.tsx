"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Media for video/PDF lessons: either an external URL (YouTube, Vimeo, SharePoint/Stream)
 * or a file uploaded to the private "course-media" bucket (stored as its path).
 */
export function MediaField({ name, defaultValue, courseId }: { name: string; defaultValue: string; courseId: string }) {
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `${courseId}/${Date.now()}-${safe}`;
    const { error } = await createClient().storage.from("course-media").upload(path, file, { upsert: false, contentType: file.type });
    setBusy(false);
    if (error) setError(error.message);
    else setValue(path);
  }

  return (
    <div>
      <label className="label">Video / document (URL or upload)</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input name={name} value={value} onChange={(e) => setValue(e.target.value)} className="input flex-1" placeholder="https://youtu.be/… or upload a file →" />
        <label className="btn-ghost cursor-pointer">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload
          <input type="file" accept="video/*,application/pdf,image/*" className="sr-only" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      </div>
      <p className="mt-1 text-xs text-brand-muted">Uploads are private and served to signed-in employees via expiring links. Remember to save the lesson after uploading.</p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
