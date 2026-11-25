import type { z } from "zod";

/**
 * Validates API payloads against shared Zod schemas in development only.
 * Logs a warning on schema mismatch without breaking runtime callers; no-op in production.
 */
export function parseApiResponse<TSchema extends z.ZodType>(
  schema: TSchema,
  payload: unknown,
  endpoint: string,
): z.infer<TSchema> {
  if (process.env.NODE_ENV === "development") {
    const result = schema.safeParse(payload);
    if (!result.success) {
      console.warn(`[api] Response validation mismatch for ${endpoint}`, result.error.issues);
      return payload as z.infer<TSchema>;
    }
    return result.data;
  }

  return payload as z.infer<TSchema>;
}
