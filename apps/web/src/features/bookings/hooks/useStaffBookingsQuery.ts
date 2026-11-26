"use client";

import type { BookingStatus } from "@hotel/shared";
import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { listBookings, queryKeys, type BookingsListResult } from "@/lib/api";
import {
  DEFAULT_STAFF_BOOKINGS_LIMIT,
  DEFAULT_STAFF_BOOKINGS_PAGE,
} from "../lib/staffBookingsParams";

export interface UseStaffBookingsQueryParams {
  statuses?: readonly BookingStatus[];
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export function useStaffBookingsQuery({
  statuses,
  from,
  to,
  q,
  page = DEFAULT_STAFF_BOOKINGS_PAGE,
  limit = DEFAULT_STAFF_BOOKINGS_LIMIT,
}: UseStaffBookingsQueryParams): UseQueryResult<BookingsListResult, Error> {
  const queryParams = {
    ...(statuses && statuses.length > 0 ? { status: [...statuses] } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(q ? { q } : {}),
    page,
    limit,
  };

  return useQuery({
    queryKey: queryKeys.bookings.list(queryParams),
    queryFn: () => listBookings(queryParams),
    placeholderData: keepPreviousData,
  });
}
