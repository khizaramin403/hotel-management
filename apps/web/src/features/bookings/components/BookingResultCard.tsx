"use client";

import type { Booking } from "@hotel/shared";
import { Button, Result } from "antd";
import { bookingReference, formatDateRange, formatPrice, plural } from "@/lib/format";

export interface BookingResultCardProps {
  booking: Booking;
  onViewBooking: () => void;
  onBackToRooms: () => void;
}

export function BookingResultCard({
  booking,
  onViewBooking,
  onBackToRooms,
}: BookingResultCardProps) {
  const reference = bookingReference(booking.id);

  return (
    <div
      data-testid="booking-result-card"
      className="mx-auto max-w-[640px] rounded-lg border border-line bg-neutral-0 p-6 md:p-8"
    >
      <Result
        status="success"
        title="Booking confirmed"
        subTitle={
          <div className="space-y-2 font-sans text-[14px] leading-[22px] text-muted">
            <p className="m-0 font-medium text-ink">
              Reference{" "}
              <span data-testid="booking-reference" className="tabular font-semibold">
                {reference}
              </span>
            </p>
            <p className="m-0">Booking confirmed. A confirmation was sent to your email.</p>
            <p className="m-0 text-[13px] leading-[20px]">
              {booking.roomType} · Room {booking.roomNumber} ·{" "}
              {formatDateRange(booking.checkIn, booking.checkOut)} ·{" "}
              {plural(booking.guests, "guest")} · {formatPrice(booking.totalPrice)}
            </p>
          </div>
        }
        extra={
          <div className="flex flex-col-reverse justify-center gap-3 sm:flex-row">
            <Button
              onClick={onBackToRooms}
              className="min-h-[44px] w-full sm:min-h-[40px] sm:w-auto sm:min-w-[88px]"
            >
              Back to rooms
            </Button>
            <Button
              type="primary"
              onClick={onViewBooking}
              className="min-h-[44px] w-full sm:min-h-[40px] sm:w-auto sm:min-w-[88px]"
            >
              View booking
            </Button>
          </div>
        }
      />
    </div>
  );
}
