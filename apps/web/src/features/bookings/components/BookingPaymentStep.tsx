"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Booking, ValidationErrorDetail } from "@hotel/shared";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Skeleton } from "antd";
import { Price } from "@/components/ui";
import {
  createBooking,
  normalizeApiError,
  queryKeys,
  simulatePayment,
  startBookingPayment,
} from "@/lib/api";
import { useBookingStatusQuery } from "../hooks/useBookingStatusQuery";

export interface ActivePaymentSession {
  bookingId: number;
  paymentId: number;
  startedAt: number;
}

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

const CONFIRMATION_WAIT_TIMEOUT_MS = 60_000;
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
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const confirmedNotifiedRef = useRef(false);

  const [overlapError, setOverlapError] = useState(false);
  const [validationErrors, setValidationErrors] = useState<readonly ValidationErrorDetail[]>([]);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [simulatingStatus, setSimulatingStatus] = useState<"paid" | "failed" | null>(null);

  const showDevPayment = process.env.NEXT_PUBLIC_SHOW_DEV_PAYMENT === "true";

  const {
    data: polledBooking,
    refetch: refetchBookingStatus,
  } = useBookingStatusQuery(paymentSession?.bookingId ?? null, paymentSession !== null);

  const isBookingConfirmed = polledBooking?.status === "confirmed";
  const isBookingCancelled = polledBooking?.status === "cancelled";
  const isCurrentPayment =
    paymentSession !== null && polledBooking?.payment?.id === paymentSession.paymentId;
  const isPaymentFailed =
    !isBookingConfirmed &&
    !isBookingCancelled &&
    isCurrentPayment &&
    polledBooking?.payment?.status === "failed";

  useEffect(() => {
    if (isBookingConfirmed && polledBooking && !confirmedNotifiedRef.current) {
      confirmedNotifiedRef.current = true;
      onConfirmed(polledBooking);
    }
  }, [isBookingConfirmed, onConfirmed, polledBooking]);

  useEffect(() => {
    if (!paymentSession || isBookingConfirmed || isBookingCancelled || isPaymentFailed) {
      return;
    }

    const elapsed = Date.now() - paymentSession.startedAt;
    const remaining = Math.max(0, CONFIRMATION_WAIT_TIMEOUT_MS - elapsed);

    const timer = window.setTimeout(() => {
      setIsTimedOut(true);
    }, remaining);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isBookingCancelled, isBookingConfirmed, isPaymentFailed, paymentSession]);

  const handlePayNow = async () => {
    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setOverlapError(false);
    setValidationErrors([]);
    setIsTimedOut(false);
    confirmedNotifiedRef.current = false;

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
        confirmedNotifiedRef.current = true;
        onConfirmed(booking);
        return;
      }

      const targetBookingId = booking?.id ?? paymentSession?.bookingId;
      if (!targetBookingId) {
        return;
      }

      const payment = await startBookingPayment(targetBookingId);
      queryClient.setQueryData<Booking | undefined>(
        queryKeys.bookings.detail(targetBookingId),
        (prev) =>
          prev
            ? { ...prev, payment: { id: payment.paymentId, status: payment.status } }
            : prev,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.detail(targetBookingId),
      });
      onPaymentStarted({
        bookingId: targetBookingId,
        paymentId: payment.paymentId,
        startedAt: Date.now(),
      });
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

  const handleSimulateOutcome = async (status: "paid" | "failed") => {
    if (!paymentSession || simulatingStatus !== null) {
      return;
    }

    setSimulatingStatus(status);
    try {
      await simulatePayment(paymentSession.paymentId, { status });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.detail(paymentSession.bookingId),
      });
      await refetchBookingStatus();
    } catch (error: unknown) {
      const apiError = normalizeApiError(error);
      message?.error?.({
        content: apiError.message || "Could not simulate payment outcome.",
        duration: 5,
      });
    } finally {
      setSimulatingStatus(null);
    }
  };

  if (paymentSession && !isBookingConfirmed) {
    if (isBookingCancelled) {
      return (
        <div className="space-y-4 rounded-lg border border-line bg-neutral-0 p-6">
          <h2 className="m-0 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
            Booking cancelled
          </h2>
          <Alert
            type="error"
            showIcon
            message="This booking was cancelled or expired before payment was confirmed."
            description={
              <Link
                href={roomPageHref}
                className="font-sans text-[14px] font-medium text-green-600 no-underline hover:underline"
              >
                Choose dates on room page
              </Link>
            }
          />
        </div>
      );
    }

    if (isPaymentFailed) {
      return (
        <div className="space-y-6 rounded-lg border border-line bg-neutral-0 p-6">
          <h2 className="m-0 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
            Payment
          </h2>
          <Alert
            type="error"
            showIcon
            message="Payment was declined by the payment provider."
            description="Your reservation is still pending. Try paying again."
          />
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

    return (
      <div
        data-testid="payment-waiting-card"
        className="space-y-6 rounded-lg border border-line bg-neutral-0 p-6"
      >
        <div className="space-y-1">
          <h2 className="m-0 font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
            Waiting for payment confirmation
          </h2>
          <p className="m-0 font-sans text-[14px] leading-[22px] text-muted">
            Payment is confirmed by our payment provider. Keep this page open for a moment.
          </p>
        </div>

        <div role="status" aria-busy="true" aria-label="Waiting for payment confirmation">
          <Skeleton active title={{ width: "45%" }} paragraph={{ rows: 2 }} />
        </div>

        {isTimedOut ? (
          <Alert
            type="warning"
            showIcon
            message="We are still waiting for confirmation. You can check My bookings."
            description={
              <Link
                href="/my-bookings"
                className="font-sans text-[14px] font-medium text-green-600 no-underline hover:underline"
              >
                My bookings
              </Link>
            }
          />
        ) : null}

        {showDevPayment ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <span className="font-sans text-[12px] font-medium leading-[18px] text-muted">
              Dev tools:
            </span>
            <Button
              size="small"
              loading={simulatingStatus === "paid"}
              disabled={simulatingStatus !== null}
              onClick={() => {
                void handleSimulateOutcome("paid");
              }}
            >
              Simulate paid
            </Button>
            <Button
              size="small"
              loading={simulatingStatus === "failed"}
              disabled={simulatingStatus !== null}
              onClick={() => {
                void handleSimulateOutcome("failed");
              }}
            >
              Simulate failed
            </Button>
          </div>
        ) : null}
      </div>
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
