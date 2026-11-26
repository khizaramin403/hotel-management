"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Booking } from "@hotel/shared";
import { useQueryClient } from "@tanstack/react-query";
import {
  normalizeApiError,
  queryKeys,
  simulatePayment,
  startBookingPayment,
} from "@/lib/api";
import { useBookingStatusQuery } from "./useBookingStatusQuery";

export interface ActivePaymentSession {
  bookingId: number;
  paymentId: number;
  startedAt: number;
}

export const PAYMENT_CONFIRMATION_TIMEOUT_MS = 60_000;

export interface UsePaymentConfirmationOptions {
  initialSession?: ActivePaymentSession | null;
  onConfirmed?: (booking: Booking) => void;
  onError?: (message: string) => void;
}

export function usePaymentConfirmation({
  initialSession = null,
  onConfirmed,
  onError,
}: UsePaymentConfirmationOptions = {}) {
  const queryClient = useQueryClient();

  const [session, setSession] = useState<ActivePaymentSession | null>(initialSession);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [simulatingStatus, setSimulatingStatus] = useState<"paid" | "failed" | null>(null);

  const confirmedBookingIdRef = useRef<number | null>(null);
  const onConfirmedRef = useRef(onConfirmed);

  useEffect(() => {
    onConfirmedRef.current = onConfirmed;
  }, [onConfirmed]);

  const { data: polledBooking, refetch: refetchBookingStatus } = useBookingStatusQuery(
    session?.bookingId ?? null,
    session !== null,
  );

  const isBookingConfirmed = polledBooking?.status === "confirmed";
  const isBookingCancelled = polledBooking?.status === "cancelled";
  const isCurrentPayment =
    session !== null && polledBooking?.payment?.id === session.paymentId;
  const isPaymentFailed =
    !isBookingConfirmed &&
    !isBookingCancelled &&
    isCurrentPayment &&
    polledBooking?.payment?.status === "failed";

  useEffect(() => {
    if (
      isBookingConfirmed &&
      polledBooking &&
      confirmedBookingIdRef.current !== polledBooking.id
    ) {
      confirmedBookingIdRef.current = polledBooking.id;
      onConfirmedRef.current?.(polledBooking);
    }
  }, [isBookingConfirmed, polledBooking]);

  useEffect(() => {
    if (!session || isBookingConfirmed || isBookingCancelled || isPaymentFailed) {
      return;
    }

    const elapsed = Date.now() - session.startedAt;
    const remaining = Math.max(0, PAYMENT_CONFIRMATION_TIMEOUT_MS - elapsed);

    const timer = window.setTimeout(() => {
      setIsTimedOut(true);
    }, remaining);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isBookingCancelled, isBookingConfirmed, isPaymentFailed, session]);

  const activateSession = useCallback(
    (nextSession: ActivePaymentSession) => {
      confirmedBookingIdRef.current = null;
      setIsTimedOut(false);
      queryClient.setQueryData<Booking | undefined>(
        queryKeys.bookings.detail(nextSession.bookingId),
        (prev) =>
          prev
            ? { ...prev, payment: { id: nextSession.paymentId, status: "pending" } }
            : prev,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.detail(nextSession.bookingId),
      });
      setSession(nextSession);
    },
    [queryClient],
  );

  const startPaymentForBooking = useCallback(
    async (bookingId: number): Promise<ActivePaymentSession | null> => {
      setIsStartingPayment(true);
      try {
        const payment = await startBookingPayment(bookingId);
        const nextSession: ActivePaymentSession = {
          bookingId,
          paymentId: payment.paymentId,
          startedAt: Date.now(),
        };
        activateSession(nextSession);
        return nextSession;
      } catch (error: unknown) {
        const apiError = normalizeApiError(error);
        onError?.(
          apiError.message || "Could not start payment. Check your connection and try again.",
        );
        return null;
      } finally {
        setIsStartingPayment(false);
      }
    },
    [activateSession, onError],
  );

  const simulateOutcome = useCallback(
    async (status: "paid" | "failed") => {
      if (!session || simulatingStatus !== null) {
        return;
      }

      setSimulatingStatus(status);
      try {
        await simulatePayment(session.paymentId, { status });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.bookings.detail(session.bookingId),
        });
        await refetchBookingStatus();
      } catch (error: unknown) {
        const apiError = normalizeApiError(error);
        onError?.(apiError.message || "Could not simulate payment outcome.");
      } finally {
        setSimulatingStatus(null);
      }
    },
    [onError, queryClient, refetchBookingStatus, session, simulatingStatus],
  );

  const resetSession = useCallback(() => {
    confirmedBookingIdRef.current = null;
    setIsTimedOut(false);
    setSimulatingStatus(null);
    setSession(null);
  }, []);

  return {
    session,
    polledBooking,
    isStartingPayment,
    isBookingConfirmed,
    isBookingCancelled,
    isPaymentFailed,
    isTimedOut,
    simulatingStatus,
    activateSession,
    startPaymentForBooking,
    simulateOutcome,
    resetSession,
  };
}
