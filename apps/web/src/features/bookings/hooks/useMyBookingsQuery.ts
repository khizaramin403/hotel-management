"use client";

import type { BookingStatus } from "@hotel/shared";
import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { listMyBookings, queryKeys, type BookingsListResult } from "@/lib/api";
import { DEFAULT_MY_BOOKINGS_LIMIT, DEFAULT_MY_BOOKINGS_PAGE } from "../lib/myBookingsParams";

export interface UseMyBookingsQueryParams {
  status: readonly BookingStatus[];
  page?: number;
  limit?: number;
}

export function useMyBookingsQuery({
  status,
  page = DEFAULT_MY_BOOKINGS_PAGE,
  limit = DEFAULT_MY_BOOKINGS_LIMIT,
}: UseMyBookingsQueryParams): UseQueryResult<BookingsListResult, Error> {
  const queryParams = {
    status: [...status],
    page,
    limit,
  };

  return useQuery({
    queryKey: queryKeys.bookings.my(queryParams),
    queryFn: () => listMyBookings(queryParams),
    placeholderData: keepPreviousData,
  });
}
