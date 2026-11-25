import {
  conversationSchema,
  cursorPaginatedResponseSchema,
  messageSchema,
  paginatedResponseSchema,
  successResponseSchema,
  type Conversation,
  type CursorMeta,
  type Message,
  type MessagesQuery,
  type PaginationMeta,
} from "@hotel/shared";
import { z } from "zod";
import { apiClient } from "../client";
import { parseApiResponse } from "../parseResponse";

const conversationEnvelopeSchema = successResponseSchema(conversationSchema);
const conversationsListEnvelopeSchema = paginatedResponseSchema(conversationSchema);
const messagesListEnvelopeSchema = cursorPaginatedResponseSchema(messageSchema);

const iceServerSchema = z.object({
  urls: z.union([z.string().min(1), z.array(z.string().min(1))]),
  username: z.string().optional(),
  credential: z.string().optional(),
});
const iceServersEnvelopeSchema = successResponseSchema(
  z.object({
    iceServers: z.array(iceServerSchema),
  }),
);

export type IceServerConfig = z.infer<typeof iceServerSchema>;

export interface ConversationsListResult {
  data: Conversation[];
  meta: PaginationMeta;
}

export interface MessagesListResult {
  data: Message[];
  meta: CursorMeta;
}

export async function createConversation(): Promise<Conversation> {
  const response = await apiClient.post("/chat/conversations", {});
  const parsed = parseApiResponse(
    conversationEnvelopeSchema,
    response.data,
    "POST /chat/conversations",
  );
  return parsed.data;
}

export async function listConversations(params?: {
  page?: number;
  limit?: number;
}): Promise<ConversationsListResult> {
  const response = await apiClient.get("/chat/conversations", { params });
  const parsed = parseApiResponse(
    conversationsListEnvelopeSchema,
    response.data,
    "GET /chat/conversations",
  );
  return { data: parsed.data, meta: parsed.meta };
}

export async function listConversationMessages(
  conversationId: number,
  params?: Partial<MessagesQuery>,
): Promise<MessagesListResult> {
  const response = await apiClient.get(`/chat/conversations/${conversationId}/messages`, {
    params,
  });
  const parsed = parseApiResponse(
    messagesListEnvelopeSchema,
    response.data,
    `GET /chat/conversations/${conversationId}/messages`,
  );
  return { data: parsed.data, meta: parsed.meta };
}

export async function getIceServers(): Promise<IceServerConfig[]> {
  const response = await apiClient.get("/chat/ice-servers");
  const parsed = parseApiResponse(iceServersEnvelopeSchema, response.data, "GET /chat/ice-servers");
  return parsed.data.iceServers;
}
