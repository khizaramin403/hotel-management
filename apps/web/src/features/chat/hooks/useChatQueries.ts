"use client";

import type { Conversation, Message } from "@hotel/shared";
import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  createConversation,
  listConversationMessages,
  listConversations,
  queryKeys,
  type ConversationsListResult,
  type MessagesListResult,
} from "@/lib/api";

export const CHAT_MESSAGES_PAGE_SIZE = 30;
export const CHAT_CONVERSATIONS_LIMIT = 50;

export const GUEST_CONVERSATION_QUERY_KEY = ["chat", "guest-conversation"] as const;

export function useGuestConversationQuery(): UseQueryResult<Conversation, Error> {
  return useQuery({
    queryKey: GUEST_CONVERSATION_QUERY_KEY,
    queryFn: createConversation,
  });
}

export function useConversationsQuery(
  enabled = true,
): UseQueryResult<ConversationsListResult, Error> {
  const params = { page: 1, limit: CHAT_CONVERSATIONS_LIMIT };
  return useQuery({
    queryKey: queryKeys.chat.conversations(params),
    queryFn: () => listConversations(params),
    enabled,
  });
}

export function useConversationMessagesInfiniteQuery(
  conversationId: number | null,
): UseInfiniteQueryResult<InfiniteData<MessagesListResult, number | undefined>, Error> {
  return useInfiniteQuery({
    queryKey: queryKeys.chat.messages(conversationId ?? 0, { limit: CHAT_MESSAGES_PAGE_SIZE }),
    queryFn: ({ pageParam }) =>
      listConversationMessages(conversationId as number, {
        limit: CHAT_MESSAGES_PAGE_SIZE,
        ...(pageParam !== undefined ? { cursor: pageParam } : {}),
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    enabled: conversationId !== null,
  });
}

/** Deduplicates cursor pages by message id and orders them chronologically (oldest -> newest). */
export function flattenChronologicalMessages(
  pages: readonly MessagesListResult[] | undefined,
): Message[] {
  if (!pages || pages.length === 0) {
    return [];
  }

  const byId = new Map<number, Message>();
  for (const page of pages) {
    for (const message of page.data) {
      byId.set(message.id, message);
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    const timeDiff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return a.id - b.id;
  });
}
