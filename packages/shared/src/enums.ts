export const ROLES = ["guest", "staff", "admin"] as const;

export const ROOM_TYPES = ["Single", "Double", "Deluxe", "Suite", "Family"] as const;

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
] as const;

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

export const CONVERSATION_STATUSES = ["open", "closed"] as const;

export const ERROR_CODES = [
  "BAD_REQUEST",
  "IDEMPOTENCY_KEY_REQUIRED",
  "UNAUTHENTICATED",
  "TOKEN_EXPIRED",
  "INVALID_SIGNATURE",
  "FORBIDDEN",
  "NOT_FOUND",
  "EMAIL_TAKEN",
  "ROOM_NUMBER_TAKEN",
  "ROOM_NOT_AVAILABLE",
  "INVALID_STATE",
  "VALIDATION_ERROR",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const;

export const ERROR_CODE = {
  BAD_REQUEST: "BAD_REQUEST",
  IDEMPOTENCY_KEY_REQUIRED: "IDEMPOTENCY_KEY_REQUIRED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  ROOM_NUMBER_TAKEN: "ROOM_NUMBER_TAKEN",
  ROOM_NOT_AVAILABLE: "ROOM_NOT_AVAILABLE",
  INVALID_STATE: "INVALID_STATE",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type BookingStatusValue = (typeof BOOKING_STATUSES)[number];

export const ALLOWED_BOOKING_TRANSITIONS: Record<
  BookingStatusValue,
  readonly BookingStatusValue[]
> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "cancelled"],
  checked_in: ["checked_out"],
  checked_out: [],
  cancelled: [],
} as const;

/** Checks whether transitioning a booking from `from` to `to` is allowed by the contract. */
export function canTransitionBookingStatus(
  from: BookingStatusValue,
  to: BookingStatusValue,
): boolean {
  return ALLOWED_BOOKING_TRANSITIONS[from].includes(to);
}
