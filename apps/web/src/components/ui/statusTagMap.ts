import type { BookingStatus, PaymentStatus } from "@hotel/shared";

export type TagStatus = BookingStatus | PaymentStatus;

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

export const STATUS_TAG_MAP: Record<TagStatus, StatusTagStyle> = {
  ...BOOKING_STATUS_TAG_MAP,
  ...PAYMENT_STATUS_TAG_MAP,
};

/** Returns label and Tailwind token classes for a booking or payment status. */
export function getStatusTagStyle(status: TagStatus, kind?: "booking" | "payment"): StatusTagStyle {
  if (kind === "booking" && status in BOOKING_STATUS_TAG_MAP) {
    return BOOKING_STATUS_TAG_MAP[status as BookingStatus];
  }
  if (kind === "payment" && status in PAYMENT_STATUS_TAG_MAP) {
    return PAYMENT_STATUS_TAG_MAP[status as PaymentStatus];
  }
  return STATUS_TAG_MAP[status];
}
