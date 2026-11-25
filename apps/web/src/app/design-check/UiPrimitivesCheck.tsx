"use client";

import { useState } from "react";
import { BOOKING_STATUSES, PAYMENT_STATUSES, ROOM_TYPES } from "@hotel/shared";
import { App, Button } from "antd";
import {
  Chip,
  EmptyState,
  ErrorState,
  PageHeader,
  Price,
  RoomImage,
  StatusTag,
} from "@/components/ui";
import { bookingReference, formatDate, formatDateRange, plural } from "@/lib/format";

export function UiPrimitivesCheck() {
  const { message } = App.useApp();
  const [selectedChip, setSelectedChip] = useState<string>("Suite");

  return (
    <section className="mt-12 border-t border-line pt-12">
      <h2 className="mb-6 font-serif text-[24px] font-semibold leading-[32px] text-ink md:text-[28px] md:leading-[36px]">
        Shared UI components
      </h2>

      <div className="space-y-8">
        <div className="rounded-lg border border-line bg-neutral-0 p-6">
          <h3 className="mb-4 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
            Chip (controlled toggle)
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {ROOM_TYPES.map((type) => (
              <Chip
                key={type}
                label={type}
                selected={selectedChip === type}
                onToggle={(next) => {
                  if (next) {
                    setSelectedChip(type);
                  }
                }}
              />
            ))}
            <Chip label="Disabled" selected={false} onToggle={() => undefined} disabled />
            <Chip label="Disabled selected" selected onToggle={() => undefined} disabled />
          </div>
        </div>

        <div className="rounded-lg border border-line bg-neutral-0 p-6">
          <h3 className="mb-4 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
            StatusTag
          </h3>
          <div className="space-y-4">
            <div>
              <div className="mb-2 font-sans text-[13px] font-medium leading-[20px] text-muted">
                Booking statuses
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {BOOKING_STATUSES.map((status) => (
                  <StatusTag key={`booking-${status}`} status={status} kind="booking" />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 font-sans text-[13px] font-medium leading-[20px] text-muted">
                Payment statuses
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {PAYMENT_STATUSES.map((status) => (
                  <StatusTag key={`payment-${status}`} status={status} kind="payment" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 rounded-lg border border-line bg-neutral-0 p-6">
          <h3 className="m-0 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
            PageHeader (H1 and H3 variants)
          </h3>
          <div className="rounded-md border border-line bg-canvas p-4">
            <PageHeader
              variant="h1"
              title="My bookings"
              subtitle="View, manage and cancel your reservations."
              action={<Button type="primary">Browse rooms</Button>}
            />
          </div>
          <div className="rounded-md border border-line bg-canvas p-4">
            <PageHeader
              variant="h3"
              title="Rooms"
              subtitle="Manage hotel inventory and nightly rates."
              action={<Button type="primary">Add room</Button>}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-line bg-neutral-0 p-6">
            <h3 className="mb-4 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
              Price and format helpers
            </h3>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-6">
                <Price amount={15000} perNight size="sm" />
                <Price amount={49500} size="md" />
                <Price amount={30000} perNight size="lg" />
              </div>
              <div className="space-y-1 font-sans text-[14px] leading-[22px] text-muted">
                <div>Reference: {bookingReference(1041)}</div>
                <div>Date: {formatDate("2026-12-20")}</div>
                <div>Range: {formatDateRange("2026-12-20", "2026-12-23")}</div>
                <div>
                  Count: {plural(1, "night")}, {plural(3, "guest")}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-neutral-0 p-6">
            <h3 className="mb-4 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
              RoomImage fallback states
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 font-sans text-[13px] text-muted">Missing image (null)</div>
                <RoomImage
                  src={null}
                  alt="Deluxe room placeholder"
                  width={240}
                  height={180}
                  className="rounded-lg"
                />
              </div>
              <div>
                <div className="mb-2 font-sans text-[13px] text-muted">
                  Missing file fallback (/images/missing.webp)
                </div>
                <RoomImage
                  src="missing-room.webp"
                  alt="Missing room photo fallback"
                  width={240}
                  height={180}
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-line bg-neutral-0 p-6">
            <h3 className="mb-4 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
              EmptyState
            </h3>
            <EmptyState
              title="No upcoming bookings"
              description="No bookings yet. Browse rooms to make your first booking."
              action={<Button type="primary">Browse rooms</Button>}
            />
          </div>

          <div className="space-y-6 rounded-lg border border-line bg-neutral-0 p-6">
            <h3 className="m-0 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
              ErrorState (Alert and Result)
            </h3>
            <ErrorState
              variant="alert"
              title="Could not load rooms"
              description="Check your connection and try again."
              onRetry={() => message.info("Retrying request")}
            />
            <ErrorState
              variant="result"
              title="Something went wrong"
              description="We could not load this reservation right now."
              onRetry={() => message.info("Retrying request")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
