import { z } from "zod";
import { idSchema, MAX_PAGE_LIMIT } from "./common";

export const createConversationSchema = z.preprocess(
  (val) => (val === undefined ? {} : val),
  z.object({}),
);

export const messagesQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(30),
});

export const sendMessageSchema = z.object({
  conversationId: idSchema,
  text: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be at most 2000 characters"),
});
