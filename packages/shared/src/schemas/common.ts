import { z } from "zod";
import {
  BOOKING_STATUSES,
  CONVERSATION_STATUSES,
  ERROR_CODES,
  PAYMENT_STATUSES,
  ROLES,
  ROOM_TYPES,
} from "../enums";
import { isValidCalendarDate, nightsBetween } from "../money";

export const MAX_STAY_NIGHTS = 30;
export const MAX_PAGE_LIMIT = 50;

export const roleSchema = z.enum(ROLES);
export const roomTypeSchema = z.enum(ROOM_TYPES);
export const bookingStatusSchema = z.enum(BOOKING_STATUSES);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const conversationStatusSchema = z.enum(CONVERSATION_STATUSES);
export const errorCodeSchema = z.enum(ERROR_CODES);

export const positiveIntSchema = z.number().int().positive();
export const nonNegativeIntSchema = z.number().int().nonnegative();
export const idSchema = positiveIntSchema;

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const emailSchema = z.string().trim().pipe(z.email("Invalid email address"));

export const dateStringSchema = z
  .string()
  .refine(isValidCalendarDate, "Invalid date. Expected a valid YYYY-MM-DD calendar date");

export const isoTimestampSchema = z.iso.datetime({ offset: true });

export const queryBooleanSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    if (val === "true" || val === "1") return true;
    if (val === "false" || val === "0") return false;
  }
  return val;
}, z.boolean());

export const paginationMetaSchema = z.object({
  page: positiveIntSchema,
  limit: positiveIntSchema,
  total: nonNegativeIntSchema,
  totalPages: nonNegativeIntSchema,
});

export const cursorMetaSchema = z.object({
  nextCursor: positiveIntSchema.nullable(),
});

export const validationErrorDetailSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export const apiErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  details: z.array(validationErrorDetailSchema).optional(),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: apiErrorSchema,
});

export const responseEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  meta: z.union([paginationMetaSchema, cursorMetaSchema]).optional(),
  error: apiErrorSchema.optional(),
});

/** Builds a Zod schema for a non-paginated success API response envelope. */
export function successResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  });
}

/** Builds a Zod schema for an offset-paginated success API response envelope. */
export function paginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });
}

/** Builds a Zod schema for a cursor-paginated success API response envelope. */
export function cursorPaginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    meta: cursorMetaSchema,
  });
}

/** Validates that `checkOut` is strictly after `checkIn` and within the 30-night stay limit. */
export function validateStayDates(checkIn: string, checkOut: string, ctx: z.RefinementCtx): void {
  if (!isValidCalendarDate(checkIn) || !isValidCalendarDate(checkOut)) {
    return;
  }

  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) {
    ctx.addIssue({
      code: "custom",
      path: ["checkOut"],
      message: "Check-out date must be after check-in date",
    });
    return;
  }

  if (nights > MAX_STAY_NIGHTS) {
    ctx.addIssue({
      code: "custom",
      path: ["checkOut"],
      message: `Stay cannot exceed ${MAX_STAY_NIGHTS} nights`,
    });
  }
}
