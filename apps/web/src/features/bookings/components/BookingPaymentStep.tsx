"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Booking, ValidationErrorDetail } from "@hotel/shared";
import { Alert, App, Button } from "antd";
import { Price } from "@/components/ui";
import { createBooking, normalizeApiError, startBookingPayment } from "@/lib/api";
import {
  usePaymentConfirmation,
  type ActivePaymentSession,
} from "../hooks/usePaymentConfirmation";
import { PaymentWaitingPanel } from "./PaymentWaitingPanel";

export type { ActivePaymentSession };

export interface BookingPaymentStepProps {
  roomId: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  roomPageHref: string;
  idempotencyKey: string | null;
  paymentSession: ActivePaymentSession | null;
  onSetIdempotencyKey: (key: string) => void;
  onPaymentStarted: (session: ActivePaymentSession) => void;
  onConfirmed: (booking: Booking) => void;
  onServerGuestDetailsError: (details: readonly ValidationErrorDetail[]) => void;
  onBack: () => void;
}

const GUEST_DETAILS_FIELD_SET = new Set(["fullName", "phone", "email", "specialRequests"]);

const VALIDATION_FIELD_LABELS: Record<string, string> = {
  roomId: "Room",
  checkIn: "Check-in date",
  checkOut: "Check-out date",
  guests: "Guests",
};

function generateUuidV4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const val = char === "x" ? rand : (rand & 0x3) | 0x8;
    return val.toString(16);
  });
}

export function BookingPaymentStep({
  roomId,
  checkIn,
  checkOut,
  guests,
  totalPrice,
  roomPageHref,
  idempotencyKey,
  paymentSession,
  onSetIdempotencyKey,
  onPaymentStarted,
  onConfirmed,
  onServerGuestDetailsError,
  onBack,
}: BookingPaymentStepProps) {
  const { message } = App.useApp();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const [overlapError, setOverlapError] = useState(false);
  const [validationErrors, setValidationErrors] = useState<readonly ValidationErrorDetail[]>([]);

  const {
    isBookingConfirmed,
    isBookingCancelled,
    isPaymentFailed,
    isTimedOut,
    simulatingStatus,
    activateSession,
    simulateOutcome,
  } = usePaymentConfirmation({
    initialSession: paymentSession,
    onConfirmed,
    onError: (msg) => {
      message?.error?.({ content: msg, duration: 5 });
    },
  });

  const handlePayNow = async () => {
    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setOverlapError(false);
    setValidationErrors([]);

    const attemptKey = idempotencyKey ?? generateUuidV4();
    if (!idempotencyKey) {
      onSetIdempotencyKey(attemptKey);
    }

    try {
      const booking =
        paymentSession !== null
          ? null
          : await createBooking({ roomId, checkIn, checkOut, guests }, attemptKey);

      if (booking && booking.status === "confirmed") {
        onConfirmed(booking);
        return;
      }

      const targetBookingId = booking?.id ?? paymentSession?.bookingId;
      if (!targetBookingId) {
        return;
      }

      const payment = await startBookingPayment(targetBookingId);
      const nextSession: ActivePaymentSession = {
        bookingId: targetBookingId,
        paymentId: payment.paymentId,
        startedAt: Date.now(),
      };
      activateSession(nextSession);
      onPaymentStarted(nextSession);
    } catch (error: unknown) {
      const apiError = normalizeApiError(error);

      if (apiError.status === 409 && apiError.code === "ROOM_NOT_AVAILABLE") {
        setOverlapError(true);
        return;
      }

      if (apiError.status === 422 && apiError.details && apiError.details.length > 0) {
        const guestFieldDetails = apiError.details.filter((detail) =>
          GUEST_DETAILS_FIELD_SET.has(detail.field),
        );
        if (guestFieldDetails.length > 0) {
          onServerGuestDetailsError(guestFieldDetails);
          return;
        }
        setValidationErrors(apiError.details);
        return;
      }

      message?.error?.({
        content:
          apiError.message || "Could not complete payment. Check your connection and try again.",
        duration: 5,
      });
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (paymentSession && !isBookingConfirmed) {
    return (
      <PaymentWaitingPanel
        isTimedOut={isTimedOut}
        isPaymentFailed={isPaymentFailed}
        isBookingCancelled={isBookingCancelled}
        isRetryingPayment={isSubmitting}
        simulatingStatus={simulatingStatus}
        cancelledActionHref={roomPageHref}
        cancelledActionLabel="Choose dates on room page"
        onSimulate={(status) => {
          void simulateOutcome(status);
        }}
        onRetryPayment={() => {
          void handlePayNow();
        }}
        onBack={onBack}
      />
    );
  }

  return (
    <div className="space-y-6 rounded-lg border border-line bg-neutral-0 p-6">
      <div className="space-y-1">
        <h2 className="m-0 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
          Payment
        </h2>
        <p className="m-0 font-sans text-[14px] leading-[22px] text-muted">
          Payment is confirmed by our payment provider.
        </p>
      </div>

      <div className="flex items-baseline justify-between gap-4 rounded-md border border-line bg-canvas px-4 py-3">
        <span className="font-sans text-[14px] font-medium leading-[22px] text-ink">Total</span>
        <Price amount={totalPrice} size="md" />
      </div>

      {overlapError ? (
        <Alert
          type="error"
          showIcon
          message="This room was just booked for these dates. Choose other dates."
          description={
            <Link
              href={roomPageHref}
              className="font-sans text-[14px] font-medium text-green-600 no-underline hover:underline"
            >
              Back to room
            </Link>
          }
        />
      ) : null}

      {validationErrors.length > 0 ? (
        <Alert
          type="error"
          showIcon
          message="Check your booking selection"
          description={
            <div className="space-y-2">
              <ul className="m-0 list-disc pl-5 font-sans text-[13px] leading-[20px]">
                {validationErrors.map((detail) => (
                  <li key={`${detail.field}-${detail.message}`}>
                    {VALIDATION_FIELD_LABELS[detail.field] ?? detail.field}: {detail.message}
                  </li>
                ))}
              </ul>
              <Link
                href={roomPageHref}
                className="inline-block font-sans text-[14px] font-medium text-green-600 no-underline hover:underline"
              >
                Back to room
              </Link>
            </div>
          }
        />
      ) : null}

      <div className="flex flex-col-reverse gap-3 pt-2 lg:flex-row lg:items-center lg:justify-between">
        <Button
          disabled={isSubmitting}
          onClick={onBack}
          className="min-h-[44px] w-full lg:min-h-[40px] lg:w-auto lg:min-w-[88px]"
        >
          Back
        </Button>
        <Button
          type="primary"
          loading={isSubmitting}
          disabled={isSubmitting}
          onClick={() => {
            void handlePayNow();
          }}
          className="min-h-[44px] w-full lg:min-h-[40px] lg:w-auto lg:min-w-[88px]"
        >
          Pay now
        </Button>
      </div>
    </div>
  );
}
