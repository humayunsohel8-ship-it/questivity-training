"use client";

import { useRouter } from "next/navigation";
import { ChatPanel } from "@/components/assistant/chat-panel";
import type { AssistantMessage } from "@/lib/types";

export function AssistantView({
  conversationId, messages, initialQuestion,
}: {
  conversationId: string | null;
  messages: AssistantMessage[];
  initialQuestion: string;
}) {
  const router = useRouter();
  return (
    <ChatPanel
      initialConversationId={conversationId}
      initialMessages={messages}
      initialQuestion={initialQuestion}
      onConversation={(id) => {
        // Keep the URL in sync so the conversation appears in history, without remounting the chat.
        window.history.replaceState(null, "", `/assistant?c=${id}`);
        router.refresh();
      }}
    />
  );
}
