"use client";

import { memo } from "react";
import type { Booking } from "@hotel/shared";
import { Button, Popconfirm } from "antd";
import { StatusTag } from "@/components/ui";
import { bookingReference, formatDateRange, formatPrice, plural } from "@/lib/format";

export interface BookingRowProps {
  booking: Booking;
  isCancelling?: boolean;
  isPaying?: boolean;
  isUpdatingStatus?: boolean;
  showGuest?: boolean;
  onView: (booking: Booking) => void;
  onCancel: (bookingId: number) => Promise<void> | void;
  onPayNow?: (booking: Booking) => void;
  onCheckIn?: (bookingId: number) => Promise<void> | void;
  onCheckOut?: (bookingId: number) => Promise<void> | void;
}

export function canCancelBooking(booking: Pick<Booking, "status">): boolean {
  return booking.status === "pending" || booking.status === "confirmed";
}

export const BookingRow = memo(function BookingRow({
  booking,
  isCancelling = false,
  isPaying = false,
  isUpdatingStatus = false,
  showGuest = false,
  onView,
  onCancel,
  onPayNow,
  onCheckIn,
  onCheckOut,
}: BookingRowProps) {
  const reference = bookingReference(booking.id);
  const canCancel = canCancelBooking(booking);
  const isRowBusy = isCancelling || isPaying || isUpdatingStatus;

  return (
    <article
      data-testid={`booking-row-${booking.id}`}
      className="space-y-3 rounded-lg border border-line bg-neutral-0 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-sans text-[13px] font-medium leading-[20px] tabular text-muted">
            {reference}
          </div>
          <h2 className="m-0 truncate font-sans text-[16px] font-semibold leading-[24px] text-ink">
            {booking.roomType} {booking.roomNumber}
          </h2>
          {showGuest ? (
            <div className="truncate font-sans text-[13px] leading-[20px] text-muted">
              {booking.guestName}
            </div>
          ) : null}
        </div>
        <StatusTag status={booking.status} kind="booking" />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 font-sans text-[13px] leading-[20px] text-muted">
        <span>
          {formatDateRange(booking.checkIn, booking.checkOut)} · {plural(booking.guests, "guest")}
        </span>
        <span className="font-serif text-[20px] font-semibold leading-[28px] tabular text-ink">
          {formatPrice(booking.totalPrice)}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
        <Button
          type="text"
          size="small"
          onClick={() => onView(booking)}
          className="min-h-[44px] md:min-h-[32px]"
        >
          View
        </Button>

        {onPayNow && booking.status === "pending" ? (
          <Button
            size="small"
            loading={isPaying}
            disabled={isRowBusy}
            onClick={() => onPayNow(booking)}
            className="min-h-[44px] md:min-h-[32px]"
          >
            Pay now
          </Button>
        ) : null}

        {onCheckIn && booking.status === "confirmed" ? (
          <Button
            type="text"
            size="small"
            loading={isUpdatingStatus}
            disabled={isRowBusy}
            onClick={() => onCheckIn(booking.id)}
            className="min-h-[44px] md:min-h-[32px]"
          >
            Check in
          </Button>
        ) : null}

        {onCheckOut && booking.status === "checked_in" ? (
          <Button
            type="text"
            size="small"
            loading={isUpdatingStatus}
            disabled={isRowBusy}
            onClick={() => onCheckOut(booking.id)}
            className="min-h-[44px] md:min-h-[32px]"
          >
            Check out
          </Button>
        ) : null}

        {canCancel ? (
          <Popconfirm
            title="Cancel this booking?"
            description="This cannot be undone."
            okText="Cancel booking"
            cancelText="Keep"
            okButtonProps={{ danger: true }}
            onConfirm={() => onCancel(booking.id)}
          >
            <Button
              type="text"
              danger
              size="small"
              loading={isCancelling}
              disabled={isRowBusy}
              className="min-h-[44px] md:min-h-[32px]"
            >
              Cancel
            </Button>
          </Popconfirm>
        ) : null}
      </div>
    </article>
  );
});
