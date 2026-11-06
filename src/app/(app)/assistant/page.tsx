import Link from "next/link";
import type { Metadata } from "next";
import { MessageSquarePlus } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AssistantView } from "./assistant-view";
import { brand } from "@/config/brand";
import { cn, formatDate } from "@/lib/utils";
import type { AssistantMessage } from "@/lib/types";

export const metadata: Metadata = { title: brand.assistantName };

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ c?: string; q?: string }> }) {
  const { c, q = "" } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: conversations } = await supabase
    .from("assistant_conversations")
    .select("id, title, updated_at")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(30);

  let messages: AssistantMessage[] = [];
  if (c) {
    const { data } = await supabase
      .from("assistant_messages")
      .select("id, role, content, citations, answered_from_kb, feedback, created_at")
      .eq("conversation_id", c)
      .order("created_at");
    messages = (data ?? []) as AssistantMessage[];
  }

  return (
    <div className="grid h-[calc(100vh-7rem)] gap-6 lg:h-[calc(100vh-5rem)] lg:grid-cols-[240px_1fr]">
      <aside className="hidden min-h-0 flex-col lg:flex">
        <Link href="/assistant" className="btn-primary mb-4"><MessageSquarePlus className="h-4 w-4" /> New conversation</Link>
        <p className="label">History</p>
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {(conversations ?? []).map((conv) => (
            <li key={conv.id}>
              <Link href={`/assistant?c=${conv.id}`} className={cn("block rounded-brand px-3 py-2 text-sm", conv.id === c ? "bg-brand-light font-semibold text-brand-dark" : "hover:bg-white")}>
                <span className="line-clamp-1">{conv.title}</span>
                <span className="text-xs text-brand-muted">{formatDate(conv.updated_at)}</span>
              </Link>
            </li>
          ))}
          {!conversations?.length && <li className="px-3 text-sm text-brand-muted">No conversations yet.</li>}
        </ul>
      </aside>
      <div className="flex min-h-0 flex-col">
        <div className="mb-4">
          <h1 className="page-title">{brand.assistantName}</h1>
          <p className="text-sm text-brand-muted">Answers come only from published knowledge-base articles, with sources.</p>
        </div>
        <div className="min-h-0 flex-1">
          <AssistantView key={c ?? "new"} conversationId={c ?? null} messages={messages} initialQuestion={q} />
        </div>
      </div>
    </div>
  );
}
