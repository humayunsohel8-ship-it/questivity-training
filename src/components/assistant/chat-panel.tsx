"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, FileText, Loader2, SendHorizontal, ThumbsDown, ThumbsUp, AlertTriangle } from "lucide-react";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";
import type { AssistantMessage } from "@/lib/types";

const SUGGESTIONS = [
  "How long should I keep a VMware snapshot?",
  "What do I do if I clicked a phishing link?",
  "What goes into a firewall rule request?",
  "Which engagement model fits a customer who needs one extra engineer?",
];

export function ChatPanel({
  initialConversationId = null,
  initialMessages = [],
  initialQuestion = "",
  compact = false,
  onConversation,
}: {
  initialConversationId?: string | null;
  initialMessages?: AssistantMessage[];
  initialQuestion?: string;
  compact?: boolean;
  onConversation?: (id: string) => void;
}) {
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<AssistantMessage[]>(initialMessages);
  const [input, setInput] = useState(initialQuestion);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  async function ask(text: string) {
    const question = text.trim();
    if (question.length < 2 || pending) return;
    setError(null);
    setInput("");
    setPending(true);
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "user", content: question, citations: [], answered_from_kb: null, feedback: null }]);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, conversationId }),
      });
      const data = await res.json();
      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
        onConversation?.(data.conversationId);
      }
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setMessages((m) => [...m, data.message as AssistantMessage]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function rate(id: string, value: 1 | -1) {
    const current = messages.find((m) => m.id === id)?.feedback;
    const feedback = current === value ? null : value;
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, feedback } : x)));
    await fetch("/api/assistant/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: id, feedback }),
    }).catch(() => undefined);
  }

  return (
    <div className={cn("flex h-full flex-col", compact ? "" : "card")}>
      <div className={cn("flex-1 space-y-5 overflow-y-auto", compact ? "p-4" : "p-6")}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-light text-brand"><Bot className="h-6 w-6" /></span>
            <div>
              <p className="font-display text-lg font-semibold">Hi, I&apos;m {brand.assistantName}</p>
              <p className="mt-1 max-w-sm text-sm text-brand-muted">
                I answer from the {brand.company} knowledge base and show my sources. If I don&apos;t know, I&apos;ll say so and flag it for the KB team.
              </p>
            </div>
            <div className="grid w-full max-w-lg gap-2">
              {SUGGESTIONS.slice(0, compact ? 3 : 4).map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-brand border border-brand-line bg-white px-3 py-2 text-left text-sm hover:border-brand hover:bg-brand-light/40">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-sm text-white">{m.content}</p>
            </div>
          ) : (
            <div key={m.id} className="flex gap-3">
              <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-light text-brand"><Bot className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1 space-y-3">
                {m.answered_from_kb === false && (
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" /> Not covered in the knowledge base yet — flagged for the KB team
                  </p>
                )}
                <div className="prose prose-sm prose-slate max-w-none prose-a:text-brand prose-pre:bg-brand-ink prose-pre:text-white prose-code:before:content-none prose-code:after:content-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
                {m.citations?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {m.citations.map((c) => (
                      <Link key={`${c.n}-${c.slug}`} href={`/kb/${c.slug}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand-line bg-white px-2.5 py-1 text-xs hover:border-brand hover:text-brand">
                        <span className="font-semibold text-brand">[{c.n}]</span>
                        <FileText className="h-3 w-3 shrink-0" />
                        <span className="truncate">{c.title}{c.heading && c.heading !== c.title ? ` › ${c.heading}` : ""}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {!m.id.startsWith("local-") && (
                  <div className="flex gap-1 text-brand-muted">
                    <button onClick={() => rate(m.id, 1)} className={cn("rounded p-1 hover:bg-brand-surface", m.feedback === 1 && "text-emerald-600")} title="Helpful">
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => rate(m.id, -1)} className={cn("rounded p-1 hover:bg-brand-surface", m.feedback === -1 && "text-red-600")} title="Not helpful">
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ),
        )}

        {pending && (
          <div className="flex items-center gap-2 text-sm text-brand-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching the knowledge base…
          </div>
        )}
        {error && <p className="rounded-brand bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className={cn("flex items-end gap-2 border-t border-brand-line bg-white", compact ? "p-3" : "p-4")}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(input);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Ask anything about Questivity processes, runbooks or policies…"
          className="input max-h-40 min-h-[42px] flex-1 resize-none"
        />
        <button className="btn-primary h-[42px]" disabled={pending || input.trim().length < 2} aria-label="Send">
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
