import type { Conversation, Message, MessagesQuery } from "@hotel/shared";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ConversationsListResult, MessagesListResult } from "@/lib/api";

type MessagesCacheShape = MessagesListResult | InfiniteData<MessagesListResult, unknown>;

function isInfiniteMessagesData(
  value: unknown,
): value is InfiniteData<MessagesListResult, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "pages" in value &&
    Array.isArray((value as { pages?: unknown }).pages)
  );
}

function isMessagesListResult(value: unknown): value is MessagesListResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data) &&
    "meta" in value
  );
}

/**
 * Inserts or updates a real-time message inside every matching TanStack Query cache entry for
 * `message.conversationId`, de-duplicating by `message.id`.
 */
export function upsertMessageInCache(
  queryClient: QueryClient,
  message: Message,
): { wasAlreadyPresent: boolean } {
  const queries = queryClient.getQueryCache().findAll({
    queryKey: ["chat", "messages", message.conversationId],
  });

  let wasAlreadyPresent = false;

  for (const query of queries) {
    const keyParams = query.queryKey[3] as Partial<MessagesQuery> | undefined;

    queryClient.setQueryData<MessagesCacheShape | undefined>(query.queryKey, (previous) => {
      if (!previous) {
        return previous;
      }

      if (isInfiniteMessagesData(previous)) {
        const existsInAnyPage = previous.pages.some((page) =>
          page.data.some((existing) => existing.id === message.id),
        );

        if (existsInAnyPage) {
          wasAlreadyPresent = true;
          return {
            ...previous,
            pages: previous.pages.map((page) =>
              page.data.some((existing) => existing.id === message.id)
                ? {
                    ...page,
                    data: page.data.map((existing) =>
                      existing.id === message.id ? message : existing,
                    ),
                  }
                : page,
            ),
          };
        }

        if (previous.pages.length === 0) {
          return {
            ...previous,
            pages: [{ data: [message], meta: { nextCursor: null } }],
          };
        }

        const [firstPage, ...restPages] = previous.pages;
        return {
          ...previous,
          pages: [
            {
              ...firstPage!,
              data: [message, ...firstPage!.data],
            },
            ...restPages,
          ],
        };
      }

      if (!isMessagesListResult(previous)) {
        return previous;
      }

      const existsInPage = previous.data.some((existing) => existing.id === message.id);
      if (existsInPage) {
        wasAlreadyPresent = true;
        return {
          ...previous,
          data: previous.data.map((existing) =>
            existing.id === message.id ? message : existing,
          ),
        };
      }

      if (keyParams?.cursor !== undefined) {
        return previous;
      }

      return {
        ...previous,
        data: [message, ...previous.data],
      };
    });
  }

  return { wasAlreadyPresent };
}

/**
 * Updates cached conversation list queries with an updated or newly opened conversation via
 * `queryClient.setQueryData`.
 */
export function upsertConversationInCache(
  queryClient: QueryClient,
  updatedConversation: Conversation,
): void {
  const queries = queryClient.getQueryCache().findAll({
    queryKey: ["chat", "conversations"],
  });

  for (const query of queries) {
    const keyParams = query.queryKey[2] as { page?: number; limit?: number } | undefined;
    const page = keyParams?.page ?? 1;

    queryClient.setQueryData<ConversationsListResult | undefined>(query.queryKey, (previous) => {
      if (!previous) {
        return previous;
      }

      const existingIndex = previous.data.findIndex(
        (conversation) => conversation.id === updatedConversation.id,
      );

      if (existingIndex !== -1) {
        if (page === 1) {
          return {
            ...previous,
            data: [
              updatedConversation,
              ...previous.data.filter((conversation) => conversation.id !== updatedConversation.id),
            ],
          };
        }

        return {
          ...previous,
          data: previous.data.map((conversation) =>
            conversation.id === updatedConversation.id ? updatedConversation : conversation,
          ),
        };
      }

      if (updatedConversation.status !== "open") {
        return previous;
      }

      const limit = previous.meta.limit || 20;
      const nextTotal = previous.meta.total + 1;

      return {
        data:
          page === 1
            ? [updatedConversation, ...previous.data].slice(0, limit)
            : previous.data,
        meta: {
          ...previous.meta,
          total: nextTotal,
          totalPages: Math.max(1, Math.ceil(nextTotal / limit)),
        },
      };
    });
  }
}
