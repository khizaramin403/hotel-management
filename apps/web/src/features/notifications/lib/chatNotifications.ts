import type { Conversation, Message } from "@hotel/shared";
import type { QueryClient } from "@tanstack/react-query";
import type { ConversationsListResult } from "@/lib/api";

const MAX_NOTIFICATION_SNIPPET_LENGTH = 100;

/** Formats incoming chat text as a compact single-line notification preview. */
export function formatChatNotificationSnippet(
  text: string,
  maxLength: number = MAX_NOTIFICATION_SNIPPET_LENGTH,
): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

/** Resolves a display sender label for a real-time chat notification from cached threads. */
export function resolveChatNotificationSender(
  queryClient: QueryClient,
  message: Message,
): string {
  if (message.senderRole === "staff" || message.senderRole === "admin") {
    return "Reception";
  }

  const listQueries = queryClient.getQueryCache().findAll({
    queryKey: ["chat", "conversations"],
  });

  for (const query of listQueries) {
    const result = query.state.data as ConversationsListResult | undefined;
    const match = result?.data?.find(
      (conversation) => conversation.id === message.conversationId,
    );
    if (match?.guestName) {
      return match.guestName;
    }
  }

  const guestConv = queryClient.getQueryData<Conversation>(["chat", "guest-conversation"]);
  if (guestConv?.id === message.conversationId && guestConv.guestName) {
    return guestConv.guestName;
  }

  return "Guest";
}
