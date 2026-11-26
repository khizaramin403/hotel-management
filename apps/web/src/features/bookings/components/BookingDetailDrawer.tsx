"use client";

import type { Booking } from "@hotel/shared";
import { Button, Drawer, Popconfirm } from "antd";
import { Price, StatusTag } from "@/components/ui";
import { bookingReference, formatDate, formatPrice, plural } from "@/lib/format";
import { canCancelBooking } from "./BookingRow";

export interface BookingDetailDrawerProps {
  booking: Booking | null;
  isCancelling?: boolean;
  isPaying?: boolean;
  onClose: () => void;
  onCancel: (bookingId: number) => Promise<void> | void;
  onPayNow: (booking: Booking) => void;
}

export function BookingDetailDrawer({
  booking,
  isCancelling = false,
  isPaying = false,
  onClose,
  onCancel,
  onPayNow,
}: BookingDetailDrawerProps) {
  const canCancel = booking ? canCancelBooking(booking) : false;
  const pricePerNight =
    booking && booking.nights > 0 ? Math.round(booking.subtotal / booking.nights) : 0;

  return (
    <Drawer
      title={
        <span className="font-serif text-[20px] font-medium leading-[28px] text-ink">
          {booking ? `Booking ${bookingReference(booking.id)}` : "Booking details"}
        </span>
      }
      placement="right"
      width={420}
      open={booking !== null}
      onClose={onClose}
      destroyOnHidden
      styles={{
        wrapper: { maxWidth: "100vw" },
      }}
    >
      {booking ? (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
            <div>
              <h3 className="m-0 font-sans text-[18px] font-semibold leading-[26px] text-ink">
                {booking.roomType} · Room {booking.roomNumber}
              </h3>
              <p className="mt-1 mb-0 font-sans text-[13px] leading-[20px] text-muted">
                Guest: {booking.guestName}
              </p>
            </div>
            <StatusTag status={booking.status} kind="booking" />
          </div>

          <dl className="m-0 space-y-3 border-b border-line pb-4 font-sans text-[14px] leading-[22px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Check-in</dt>
              <dd className="m-0 font-medium text-ink">{formatDate(booking.checkIn)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Check-out</dt>
              <dd className="m-0 font-medium text-ink">{formatDate(booking.checkOut)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Stay</dt>
              <dd className="m-0 text-ink">
                {plural(booking.nights, "night")} · {plural(booking.guests, "guest")}
              </dd>
            </div>
          </dl>

          <div className="space-y-3 border-b border-line pb-4 font-sans text-[14px] leading-[22px]">
            <h4 className="m-0 font-sans text-[13px] font-semibold uppercase tracking-[0.02em] text-muted">
              Price breakdown
            </h4>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">
                {plural(booking.nights, "night")} x{" "}
                {formatPrice(pricePerNight, { includeCurrency: false })}
              </span>
              <span className="tabular text-ink">{formatPrice(booking.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Taxes (10%)</span>
              <span className="tabular text-ink">{formatPrice(booking.taxAmount)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
              <span className="font-medium text-ink">Total</span>
              <Price amount={booking.totalPrice} size="sm" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-line pb-4 font-sans text-[14px] leading-[22px]">
            <span className="text-muted">Payment status</span>
            {booking.payment ? (
              <StatusTag status={booking.payment.status} kind="payment" />
            ) : (
              <div className="flex items-center gap-2">
                <StatusTag status="pending" kind="payment" />
                <span className="text-[13px] text-muted">Unpaid</span>
              </div>
            )}
          </div>

          {booking.status === "pending" || canCancel ? (
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
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
                    danger
                    loading={isCancelling}
                    disabled={isPaying}
                    className="min-h-[44px] w-full sm:min-h-[40px] sm:w-auto sm:min-w-[88px]"
                  >
                    Cancel
                  </Button>
                </Popconfirm>
              ) : (
                <span />
              )}

              {booking.status === "pending" ? (
                <Button
                  type="primary"
                  loading={isPaying}
                  disabled={isCancelling || isPaying}
                  onClick={() => onPayNow(booking)}
                  className="min-h-[44px] w-full sm:min-h-[40px] sm:w-auto sm:min-w-[88px]"
                >
                  Pay now
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}
