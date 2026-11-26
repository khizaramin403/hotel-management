"use client";

import Link from "next/link";
import type { RoomDetail } from "@hotel/shared";
import { Alert, Button, Tag } from "antd";
import { ErrorState } from "@/components/ui";
import { formatDateRange, formatPrice, plural } from "@/lib/format";

export interface BookingRoomStepProps {
  room: Pick<RoomDetail, "id" | "number" | "type" | "pricePerNight" | "capacity" | "isActive">;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  roomPageHref: string;
  isCheckingAvailability: boolean;
  isAvailable: boolean;
  isUnavailable: boolean;
  isAvailabilityError: boolean;
  onRetryAvailability: () => void;
  onBackToRoom: () => void;
  onContinue: () => void;
}

export function BookingRoomStep({
  room,
  checkIn,
  checkOut,
  guests,
  nights,
  roomPageHref,
  isCheckingAvailability,
  isAvailable,
  isUnavailable,
  isAvailabilityError,
  onRetryAvailability,
  onBackToRoom,
  onContinue,
}: BookingRoomStepProps) {
  const exceedsCapacity = guests > room.capacity;
  const isRoomInactive = !room.isActive;
  const canContinue =
    isAvailable && !isCheckingAvailability && !isRoomInactive && !exceedsCapacity;

  return (
    <div className="space-y-6 rounded-lg border border-line bg-neutral-0 p-6">
      <div className="space-y-1">
        <h2 className="m-0 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
          Confirm room details
        </h2>
        <p className="m-0 font-sans text-[14px] leading-[22px] text-muted">
          Review your room, dates, and guest count before entering your details.
        </p>
      </div>

      <div aria-live="polite">
        {isCheckingAvailability ? (
          <p className="m-0 font-sans text-[13px] leading-[20px] text-muted">
            Checking room availability...
          </p>
        ) : isAvailabilityError ? (
          <ErrorState
            variant="alert"
            title="Could not check availability"
            description="Check your connection and try again."
            onRetry={onRetryAvailability}
          />
        ) : isUnavailable || isRoomInactive ? (
          <Alert
            type="error"
            showIcon
            message="This room was just booked for these dates. Choose other dates."
            description={
              <Link
                href={roomPageHref}
                className="font-sans text-[14px] font-medium text-green-600 no-underline hover:underline"
              >
                Choose other dates
              </Link>
            }
          />
        ) : exceedsCapacity ? (
          <Alert
            type="error"
            showIcon
            message={`This room supports up to ${plural(room.capacity, "guest")}.`}
            description={
              <Link
                href={roomPageHref}
                className="font-sans text-[14px] font-medium text-green-600 no-underline hover:underline"
              >
                Change guests
              </Link>
            }
          />
        ) : isAvailable ? (
          <Tag
            bordered={false}
            className="m-0 inline-flex h-6 items-center gap-1 rounded-sm border-0 bg-success-bg px-2 font-sans text-[12px] font-medium leading-[18px] text-success-text"
          >
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success"
            />
            <span>Available</span>
          </Tag>
        ) : null}
      </div>

      <dl className="m-0 divide-y divide-line border-t border-b border-line">
        <div className="flex items-start justify-between gap-4 py-4">
          <div className="space-y-0.5">
            <dt className="font-sans text-[13px] font-medium leading-[20px] text-muted">Room</dt>
            <dd className="m-0 font-sans text-[14px] font-medium leading-[22px] text-ink">
              {room.type} · Room {room.number}
            </dd>
            <dd className="m-0 font-sans text-[13px] leading-[20px] text-muted">
              Up to {plural(room.capacity, "guest")} · {formatPrice(room.pricePerNight)} per night
            </dd>
          </div>
          <Link
            href={roomPageHref}
            aria-label="Change room"
            className="inline-flex min-h-[44px] shrink-0 items-center font-sans text-[14px] font-medium text-green-600 no-underline hover:underline lg:min-h-0"
          >
            Change
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4 py-4">
          <div className="space-y-0.5">
            <dt className="font-sans text-[13px] font-medium leading-[20px] text-muted">Dates</dt>
            <dd className="m-0 font-sans text-[14px] font-medium leading-[22px] text-ink">
              {formatDateRange(checkIn, checkOut)}
            </dd>
            <dd className="m-0 font-sans text-[13px] leading-[20px] text-muted">
              {plural(nights, "night")}
            </dd>
          </div>
          <Link
            href={roomPageHref}
            aria-label="Change dates"
            className="inline-flex min-h-[44px] shrink-0 items-center font-sans text-[14px] font-medium text-green-600 no-underline hover:underline lg:min-h-0"
          >
            Change
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4 py-4">
          <div className="space-y-0.5">
            <dt className="font-sans text-[13px] font-medium leading-[20px] text-muted">Guests</dt>
            <dd className="m-0 font-sans text-[14px] font-medium leading-[22px] text-ink">
              {plural(guests, "guest")}
            </dd>
          </div>
          <Link
            href={roomPageHref}
            aria-label="Change guests"
            className="inline-flex min-h-[44px] shrink-0 items-center font-sans text-[14px] font-medium text-green-600 no-underline hover:underline lg:min-h-0"
          >
            Change
          </Link>
        </div>
      </dl>

      <div className="flex flex-col-reverse gap-3 pt-2 lg:flex-row lg:items-center lg:justify-between">
        <Button
          onClick={onBackToRoom}
          className="min-h-[44px] w-full lg:min-h-[40px] lg:w-auto lg:min-w-[88px]"
        >
          Back
        </Button>
        <Button
          type="primary"
          disabled={!canContinue}
          loading={isCheckingAvailability}
          onClick={onContinue}
          className="min-h-[44px] w-full lg:min-h-[40px] lg:w-auto lg:min-w-[88px]"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
