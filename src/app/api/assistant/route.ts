import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { answerQuestion, searchOnlyAnswer, type KbChunk } from "@/lib/assistant";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  message: z.string().trim().min(2).max(2000),
  conversationId: z.string().uuid().nullish(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please enter a question (2–2000 characters)." }, { status: 400 });
  const { message } = parsed.data;
  let conversationId = parsed.data.conversationId ?? null;

  // Rate limit per user per hour
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("assistant_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("role", "user")
    .gte("created_at", since);
  if ((count ?? 0) >= env.assistantHourlyLimit()) {
    return NextResponse.json({ error: "You've reached the hourly question limit. Please try again later." }, { status: 429 });
  }

  // Conversation (create or verify ownership via RLS)
  if (conversationId) {
    const { data } = await supabase.from("assistant_conversations").select("id").eq("id", conversationId).maybeSingle();
    if (!data) conversationId = null;
  }
  if (!conversationId) {
    const { data, error } = await supabase
      .from("assistant_conversations")
      .insert({ user_id: user.id, title: message.slice(0, 80) })
      .select("id")
      .single();
    if (error || !data) return NextResponse.json({ error: "Could not start a conversation." }, { status: 500 });
    conversationId = data.id as string;
  }

  // Recent history for follow-up questions
  const { data: historyRows } = await supabase
    .from("assistant_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(6);
  const history = (historyRows ?? [])
    .reverse()
    .map((r) => ({ role: r.role as "user" | "assistant", content: r.content as string }));

  // Retrieve: current question plus the previous user turn (helps short follow-ups)
  const lastUser = [...history].reverse().find((h) => h.role === "user")?.content ?? "";
  const { data: chunkRows } = await supabase.rpc("search_kb_chunks", {
    p_query: `${message} ${message.length < 60 ? lastUser : ""}`.trim(),
    p_limit: 6,
  });
  const chunks = (chunkRows ?? []) as KbChunk[];

  await supabase.from("assistant_messages").insert({
    conversation_id: conversationId,
    user_id: user.id,
    role: "user",
    content: message,
  });

  // AI answers are optional: on only when an admin enabled them AND a Claude key is configured.
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("org_settings").select("ai_assistant_enabled").eq("id", true).maybeSingle(),
  ]);
  const useAi = Boolean(settings?.ai_assistant_enabled) && env.hasAnthropicKey();

  let answer;
  if (useAi) {
    try {
      answer = await answerQuestion({
        question: message,
        history,
        chunks,
        userName: profile?.full_name || "a colleague",
      });
    } catch (err) {
      // If Claude is unreachable, fall back to search results rather than failing.
      console.error("assistant error — falling back to search mode", err);
      answer = searchOnlyAnswer(chunks);
    }
  } else {
    answer = searchOnlyAnswer(chunks);
  }

  const { data: saved } = await supabase
    .from("assistant_messages")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content: answer.text,
      citations: answer.citations,
      answered_from_kb: answer.answeredFromKb,
    })
    .select("id, role, content, citations, answered_from_kb, feedback, created_at")
    .single();

  await supabase
    .from("assistant_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return NextResponse.json({ conversationId, message: saved });
}
