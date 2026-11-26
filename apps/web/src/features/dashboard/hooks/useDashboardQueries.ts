"use client";

import type { ReportQuery } from "@hotel/shared";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  getOccupancyReport,
  getSalesReport,
  listBookings,
  queryKeys,
  type BookingsListResult,
  type OccupancyReport,
  type SalesReport,
} from "@/lib/api";

export const RECENT_BOOKINGS_LIMIT = 5;

export function useSalesReportQuery(range: ReportQuery): UseQueryResult<SalesReport, Error> {
  return useQuery({
    queryKey: queryKeys.reports.sales(range),
    queryFn: () => getSalesReport(range),
  });
}

export function useOccupancyReportQuery(range: ReportQuery): UseQueryResult<OccupancyReport, Error> {
  return useQuery({
    queryKey: queryKeys.reports.occupancy(range),
    queryFn: () => getOccupancyReport(range),
  });
}

export function useCheckInsTodayQuery(today: string): UseQueryResult<BookingsListResult, Error> {
  return useQuery({
    queryKey: queryKeys.bookings.list({ status: "confirmed", from: today, to: today }),
    queryFn: () => listBookings({ status: "confirmed", from: today, to: today }),
  });
}

export function useRecentBookingsQuery(): UseQueryResult<BookingsListResult, Error> {
  const params = { page: 1, limit: RECENT_BOOKINGS_LIMIT };
  return useQuery({
    queryKey: queryKeys.bookings.list(params),
    queryFn: () => listBookings(params),
  });
}
