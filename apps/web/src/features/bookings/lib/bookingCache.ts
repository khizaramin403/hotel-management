import type { Booking, BookingStatus } from "@hotel/shared";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys, type BookingsListKeyParams, type BookingsListResult } from "@/lib/api";

function normalizeStatusFilter(
  status: BookingsListKeyParams["status"],
): readonly BookingStatus[] | null {
  if (!status) {
    return null;
  }
  return typeof status === "string" ? [status] : status;
}

export function updateMyBookingsCache(queryClient: QueryClient, updatedBooking: Booking): void {
  queryClient.setQueryData<Booking>(queryKeys.bookings.detail(updatedBooking.id), updatedBooking);

  const listQueries = queryClient.getQueryCache().findAll({
    queryKey: queryKeys.bookings.myLists(),
  });

  for (const query of listQueries) {
    const keyParams = query.queryKey[2] as BookingsListKeyParams | undefined;
    const allowedStatuses = normalizeStatusFilter(keyParams?.status);
    const matchesQueryStatus =
      allowedStatuses === null || allowedStatuses.includes(updatedBooking.status);

    queryClient.setQueryData<BookingsListResult | undefined>(query.queryKey, (previous) => {
      if (!previous) {
        return previous;
      }

      const existsInPage = previous.data.some((item) => item.id === updatedBooking.id);

      if (matchesQueryStatus) {
        if (existsInPage) {
          return {
            ...previous,
            data: previous.data.map((item) =>
              item.id === updatedBooking.id ? updatedBooking : item,
            ),
          };
        }

        const page = keyParams?.page ?? 1;
        const limit = previous.meta.limit;
        const nextTotal = previous.meta.total + 1;
        return {
          data: page === 1 ? [updatedBooking, ...previous.data].slice(0, limit) : previous.data,
          meta: {
            ...previous.meta,
            total: nextTotal,
            totalPages: Math.max(1, Math.ceil(nextTotal / limit)),
          },
        };
      }

      if (!existsInPage) {
        return previous;
      }

      const nextData = previous.data.filter((item) => item.id !== updatedBooking.id);
      const nextTotal = Math.max(0, previous.meta.total - 1);
      const limit = previous.meta.limit;

      return {
        data: nextData,
        meta: {
          ...previous.meta,
          total: nextTotal,
          totalPages: nextTotal === 0 ? 0 : Math.ceil(nextTotal / limit),
        },
      };
    });
  }
}
