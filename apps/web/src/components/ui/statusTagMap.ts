import type { BookingStatus, PaymentStatus } from "@hotel/shared";

export type RoomStatusTag = "active" | "inactive";
export type TagStatus = BookingStatus | PaymentStatus | RoomStatusTag;

export interface StatusTagStyle {
  label: string;
  bgClass: string;
  textClass: string;
  dotClass: string;
}

const PENDING_STYLE: StatusTagStyle = {
  label: "Pending",
  bgClass: "bg-warning-bg",
  textClass: "text-warning-text",
  dotClass: "bg-warning",
};

const CONFIRMED_STYLE: StatusTagStyle = {
  label: "Confirmed",
  bgClass: "bg-success-bg",
  textClass: "text-success-text",
  dotClass: "bg-success",
};

const CHECKED_IN_STYLE: StatusTagStyle = {
  label: "Checked in",
  bgClass: "bg-info-bg",
  textClass: "text-info",
  dotClass: "bg-info",
};

const CHECKED_OUT_STYLE: StatusTagStyle = {
  label: "Checked out",
  bgClass: "bg-neutral-100",
  textClass: "text-neutral-700",
  dotClass: "bg-neutral-400",
};

const CANCELLED_STYLE: StatusTagStyle = {
  label: "Cancelled",
  bgClass: "bg-error-bg",
  textClass: "text-error",
  dotClass: "bg-error",
};

const PAID_STYLE: StatusTagStyle = {
  ...CONFIRMED_STYLE,
  label: "Paid",
};

const FAILED_STYLE: StatusTagStyle = {
  ...CANCELLED_STYLE,
  label: "Failed",
};

const REFUNDED_STYLE: StatusTagStyle = {
  ...CHECKED_OUT_STYLE,
  label: "Refunded",
};

const ACTIVE_STYLE: StatusTagStyle = {
  ...CONFIRMED_STYLE,
  label: "Active",
};

const INACTIVE_STYLE: StatusTagStyle = {
  ...CHECKED_OUT_STYLE,
  label: "Inactive",
};

export const BOOKING_STATUS_TAG_MAP: Record<BookingStatus, StatusTagStyle> = {
  pending: PENDING_STYLE,
  confirmed: CONFIRMED_STYLE,
  checked_in: CHECKED_IN_STYLE,
  checked_out: CHECKED_OUT_STYLE,
  cancelled: CANCELLED_STYLE,
};

export const PAYMENT_STATUS_TAG_MAP: Record<PaymentStatus, StatusTagStyle> = {
  pending: PENDING_STYLE,
  paid: PAID_STYLE,
  failed: FAILED_STYLE,
  refunded: REFUNDED_STYLE,
};

export const ROOM_STATUS_TAG_MAP: Record<RoomStatusTag, StatusTagStyle> = {
  active: ACTIVE_STYLE,
  inactive: INACTIVE_STYLE,
};

export const STATUS_TAG_MAP: Record<TagStatus, StatusTagStyle> = {
  ...BOOKING_STATUS_TAG_MAP,
  ...PAYMENT_STATUS_TAG_MAP,
  ...ROOM_STATUS_TAG_MAP,
};

/** Returns label and Tailwind token classes for a booking, payment, or room status. */
export function getStatusTagStyle(
  status: TagStatus,
  kind?: "booking" | "payment" | "room",
): StatusTagStyle {
  if (kind === "booking" && status in BOOKING_STATUS_TAG_MAP) {
    return BOOKING_STATUS_TAG_MAP[status as BookingStatus];
  }
  if (kind === "payment" && status in PAYMENT_STATUS_TAG_MAP) {
    return PAYMENT_STATUS_TAG_MAP[status as PaymentStatus];
  }
  if (kind === "room" && status in ROOM_STATUS_TAG_MAP) {
    return ROOM_STATUS_TAG_MAP[status as RoomStatusTag];
  }
  return STATUS_TAG_MAP[status];
}
