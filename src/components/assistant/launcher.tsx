"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Maximize2, X } from "lucide-react";
import { brand } from "@/config/brand";
import { ChatPanel } from "./chat-panel";

/** Floating assistant available on every page (except the full assistant page). */
export function AssistantLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  if (pathname.startsWith("/assistant") || pathname.startsWith("/certificates/")) return null;

  return (
    <div className="no-print">
      {open && (
        <div className="fixed inset-x-3 bottom-20 z-50 flex h-[70vh] flex-col overflow-hidden rounded-brand border border-brand-line bg-brand-surface shadow-2xl sm:inset-x-auto sm:right-6 sm:w-[420px]">
          <div className="flex items-center justify-between bg-brand-dark px-4 py-3 text-white">
            <p className="flex items-center gap-2 text-sm font-semibold"><Bot className="h-4 w-4 text-brand-accent" /> {brand.assistantName}</p>
            <div className="flex gap-1">
              <Link href={conversationId ? `/assistant?c=${conversationId}` : "/assistant"} className="rounded p-1.5 hover:bg-white/10" title="Open full screen">
                <Maximize2 className="h-4 w-4" />
              </Link>
              <button onClick={() => setOpen(false)} className="rounded p-1.5 hover:bg-white/10" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <ChatPanel compact initialConversationId={conversationId} onConversation={setConversationId} />
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-lg transition hover:scale-105 hover:bg-brand-dark sm:right-6"
        aria-label={`Ask ${brand.assistantName}`}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>
    </div>
  );
}
