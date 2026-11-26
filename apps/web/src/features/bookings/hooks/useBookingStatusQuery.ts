"use client";

import type { Booking } from "@hotel/shared";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { ApiClientError, getBooking, queryKeys } from "@/lib/api";

export const BOOKING_POLL_INTERVAL_MS = 2000;

export function isTerminalBookingState(booking: Booking | undefined): boolean {
  if (!booking) {
    return false;
  }

  return (
    booking.status === "confirmed" ||
    booking.status === "cancelled" ||
    booking.payment?.status === "failed"
  );
}

export function useBookingStatusQuery(
  bookingId: number | null,
  enabled: boolean,
): UseQueryResult<Booking, Error> {
  const queryClient = useQueryClient();
  const isValidId = bookingId !== null && Number.isInteger(bookingId) && bookingId > 0;

  return useQuery({
    queryKey: queryKeys.bookings.detail(isValidId ? bookingId : 0),
    queryFn: () => getBooking(bookingId as number),
    enabled: enabled && isValidId,
    refetchInterval: (query) =>
      isTerminalBookingState(query.state.data) ? false : BOOKING_POLL_INTERVAL_MS,
    retry: (failureCount, error) => {
      const configuredRetry = queryClient.getDefaultOptions().queries?.retry;
      if (configuredRetry === false) {
        return false;
      }
      if (
        error instanceof ApiClientError &&
        (error.status === 403 || error.status === 404)
      ) {
        return false;
      }
      const maxRetries = typeof configuredRetry === "number" ? configuredRetry : 1;
      return failureCount < maxRetries;
    },
  });
}
