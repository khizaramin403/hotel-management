import {
  createConversationSchema,
  ERROR_CODE,
  idParamSchema,
  MAX_PAGE_LIMIT,
  messagesQuerySchema,
} from "@hotel/shared";
import type MockAdapter from "axios-mock-adapter";
import { z } from "zod";
import {
  cloneConversation,
  cloneMessage,
  createOrGetMockConversation,
  findMockConversationById,
  getMockConversations,
  getMockMessagesForConversation,
  mockError,
  paginatedEnvelope,
  parseJsonBody,
  requireAuthenticated,
  requireRole,
  responseHeadersForRequest,
  successEnvelope,
  zodIssuesToDetails,
} from "../db";

const conversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(20),
});

const MESSAGES_ROUTE_REGEX = /\/chat\/conversations\/([^/?]+)\/messages$/;

function getPathname(url: string | undefined): string {
  return (url ?? "").split("?")[0] ?? "";
}

export function registerChatHandlers(mock: MockAdapter): void {
  mock.onPost("/chat/conversations").reply((config) => {
    const auth = requireRole(config, ["guest"]);
    if ("error" in auth) {
      return auth.error;
    }

    const body = parseJsonBody(config.data);
    if (body === null) {
      return mockError(400, ERROR_CODE.BAD_REQUEST, "Malformed JSON", config);
    }

    const parsed = createConversationSchema.safeParse(body);
    if (!parsed.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid request body",
        config,
        zodIssuesToDetails(parsed.error),
      );
    }

    const conversation = createOrGetMockConversation(auth.user);
    return [201, successEnvelope(conversation), responseHeadersForRequest(config)];
  });

  mock.onGet("/chat/conversations").reply((config) => {
    const auth = requireAuthenticated(config);
    if ("error" in auth) {
      return auth.error;
    }

    const parsedQuery = conversationsQuerySchema.safeParse(config.params ?? {});
    if (!parsedQuery.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid query parameters",
        config,
        zodIssuesToDetails(parsedQuery.error),
      );
    }

    const all = getMockConversations();
    const visible =
      auth.user.role === "guest"
        ? all.filter((conversation) => conversation.guestId === auth.user.id)
        : all.filter((conversation) => conversation.status === "open");

    const sorted = [...visible]
      .sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ?? "";
        const bTime = b.lastMessage?.createdAt ?? "";
        if (bTime !== aTime) {
          return bTime.localeCompare(aTime);
        }
        return b.id - a.id;
      })
      .map(cloneConversation);

    return [
      200,
      paginatedEnvelope(sorted, parsedQuery.data.page, parsedQuery.data.limit),
      responseHeadersForRequest(config),
    ];
  });

  mock.onGet(MESSAGES_ROUTE_REGEX).reply((config) => {
    const auth = requireAuthenticated(config);
    if ("error" in auth) {
      return auth.error;
    }

    const match = MESSAGES_ROUTE_REGEX.exec(getPathname(config.url));
    const parsedId = idParamSchema.safeParse({ id: match?.[1] });
    if (!parsedId.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid conversation id",
        config,
        zodIssuesToDetails(parsedId.error),
      );
    }

    const conversation = findMockConversationById(parsedId.data.id);
    if (!conversation) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Conversation not found", config);
    }

    if (auth.user.role === "guest" && conversation.guestId !== auth.user.id) {
      return mockError(403, ERROR_CODE.FORBIDDEN, "Access denied", config);
    }

    const parsedQuery = messagesQuerySchema.safeParse(config.params ?? {});
    if (!parsedQuery.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid message query",
        config,
        zodIssuesToDetails(parsedQuery.error),
      );
    }

    const { cursor, limit } = parsedQuery.data;
    const newestFirst = getMockMessagesForConversation(conversation.id);
    const afterCursor =
      cursor !== undefined
        ? newestFirst.filter((message) => message.id < cursor)
        : newestFirst;

    const pageItems = afterCursor.slice(0, limit).map(cloneMessage);
    const hasMore = afterCursor.length > limit;
    const nextCursor =
      hasMore && pageItems.length > 0 ? (pageItems[pageItems.length - 1]?.id ?? null) : null;

    return [
      200,
      {
        success: true,
        data: pageItems,
        meta: { nextCursor },
      },
      responseHeadersForRequest(config),
    ];
  });

  mock.onGet("/chat/ice-servers").reply((config) => {
    const auth = requireAuthenticated(config);
    if ("error" in auth) {
      return auth.error;
    }

    return [
      200,
      successEnvelope({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      }),
      responseHeadersForRequest(config),
    ];
  });
}
