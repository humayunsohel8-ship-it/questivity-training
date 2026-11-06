"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Markdown textarea with a live preview tab. */
export function MarkdownEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  return (
    <div>
      <div className="mb-2 flex gap-1">
        {(["write", "preview"] as const).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className={cn("rounded-brand px-3 py-1 text-xs font-semibold capitalize", tab === t ? "bg-brand text-white" : "bg-brand-surface text-brand-muted")}
          >
            {t}
          </button>
        ))}
      </div>
      <textarea
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={24}
        className={cn("input font-mono text-[13px] leading-relaxed", tab === "preview" && "hidden")}
      />
      {tab === "preview" && (
        <div className="prose prose-slate min-h-[300px] max-w-none rounded-brand border border-brand-line bg-white p-6 prose-headings:font-display">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || "_Nothing to preview yet._"}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
