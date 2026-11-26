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

function matchesBookingQueryParams(
  keyParams: BookingsListKeyParams | undefined,
  booking: Booking,
): boolean {
  const allowedStatuses = normalizeStatusFilter(keyParams?.status);
  if (allowedStatuses !== null && !allowedStatuses.includes(booking.status)) {
    return false;
  }

  if (keyParams?.from !== undefined && booking.checkIn < keyParams.from) {
    return false;
  }

  if (keyParams?.to !== undefined && booking.checkIn > keyParams.to) {
    return false;
  }

  if (keyParams?.q !== undefined) {
    const needle = keyParams.q.trim().toLowerCase();
    if (needle.length > 0) {
      const ref = `bk-${booking.id}`;
      const matchesText =
        ref.includes(needle) ||
        String(booking.id).includes(needle) ||
        booking.guestName.toLowerCase().includes(needle) ||
        booking.roomNumber.toLowerCase().includes(needle);
      if (!matchesText) {
        return false;
      }
    }
  }

  return true;
}

function updateCachedListQueries(
  queryClient: QueryClient,
  listRootKey: readonly unknown[],
  updatedBooking: Booking,
): void {
  const listQueries = queryClient.getQueryCache().findAll({
    queryKey: listRootKey,
  });

  for (const query of listQueries) {
    const keyParams = query.queryKey[2] as BookingsListKeyParams | undefined;
    const matchesQuery = matchesBookingQueryParams(keyParams, updatedBooking);

    queryClient.setQueryData<BookingsListResult | undefined>(query.queryKey, (previous) => {
      if (!previous) {
        return previous;
      }

      const existsInPage = previous.data.some((item) => item.id === updatedBooking.id);

      if (matchesQuery) {
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

export function updateMyBookingsCache(queryClient: QueryClient, updatedBooking: Booking): void {
  queryClient.setQueryData<Booking>(queryKeys.bookings.detail(updatedBooking.id), updatedBooking);
  updateCachedListQueries(queryClient, queryKeys.bookings.myLists(), updatedBooking);
}

export function updateStaffBookingsCache(queryClient: QueryClient, updatedBooking: Booking): void {
  queryClient.setQueryData<Booking>(queryKeys.bookings.detail(updatedBooking.id), updatedBooking);
  updateCachedListQueries(queryClient, queryKeys.bookings.lists(), updatedBooking);
  updateCachedListQueries(queryClient, queryKeys.bookings.myLists(), updatedBooking);
}
