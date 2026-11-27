import type { Booking, BookingStatus, Role } from "@hotel/shared";
import type { Query, QueryClient } from "@tanstack/react-query";
import type { BookingsListKeyParams, BookingsListResult } from "@/lib/api";
import { queryKeys } from "@/lib/api/queryKeys";
import { bookingReference, formatDate } from "@/lib/format";
import { formatChatTime } from "@/features/chat/lib/chatFormat";
import type { AppDispatch, RootState } from "@/store";
import { addNotification, type NotificationType } from "@/store/slices/notificationsSlice";

function isBookingRecord(value: unknown): value is Booking {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id?: unknown }).id === "number" &&
    "status" in value &&
    typeof (value as { status?: unknown }).status === "string" &&
    "roomNumber" in value &&
    "roomType" in value
  );
}

function isBookingsListResult(value: unknown): value is BookingsListResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
  );
}

function isUnfilteredFirstPageQuery(params: BookingsListKeyParams | undefined): boolean {
  const hasStatusFilter = Array.isArray(params?.status)
    ? params.status.length > 0
    : Boolean(params?.status);
  return !hasStatusFilter && !params?.q && (params?.page ?? 1) === 1;
}

function dispatchGuestBookingStatusNotification(
  dispatch: AppDispatch,
  booking: Booking,
  prevStatus: BookingStatus | undefined,
): void {
  if (prevStatus === undefined || prevStatus === booking.status) {
    return;
  }

  if (booking.status === "confirmed") {
    dispatch(
      addNotification({
        id: `booking-confirmed-${booking.id}`,
        type: "booking_confirmed",
        text: `Booking ${bookingReference(booking.id)} confirmed (${booking.roomType} ${booking.roomNumber}).`,
        createdAt: new Date().toISOString(),
      }),
    );
  } else if (booking.status === "cancelled") {
    dispatch(
      addNotification({
        id: `booking-cancelled-${booking.id}`,
        type: "booking_cancelled",
        text: `Booking ${bookingReference(booking.id)} cancelled (${booking.roomType} ${booking.roomNumber}).`,
        createdAt: new Date().toISOString(),
      }),
    );
  }
}

/** Resolves the route path for a notification based on its type and the signed-in role. */
export function getNotificationHref(
  type: NotificationType,
  role: Role | null | undefined,
): string | null {
  if (type === "chat_message") {
    return role === "guest" ? "/chat" : "/dashboard/chat";
  }
  if (role === "guest") {
    return "/my-bookings";
  }
  if (role === "staff" || role === "admin") {
    return "/dashboard/bookings";
  }
  return null;
}

/** Formats a notification UTC ISO timestamp for compact display inside the bell dropdown. */
export function formatNotificationTime(isoTimestamp: string, now: Date = new Date()): string {
  const ms = Date.parse(isoTimestamp);
  if (Number.isNaN(ms)) {
    return "";
  }
  const parsed = new Date(ms);
  const sameLocalDay =
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate();

  const time = formatChatTime(isoTimestamp);
  if (sameLocalDay) {
    return time;
  }
  const dateLabel = formatDate(parsed, { includeYear: false });
  return time ? `${dateLabel}, ${time}` : dateLabel;
}

/**
 * Watches TanStack Query booking cache updates (with zero REST calls) and feeds the Redux
 * `notifications` slice:
 * - guest: confirmed / cancelled transitions on cached booking detail or `my` lists
 * - staff / admin: new bookings arriving in `bookings.list` after the initial list baseline
 */
export function observeBookingQueryNotifications(
  queryClient: QueryClient,
  dispatch: AppDispatch,
  getState: () => RootState,
): () => void {
  const knownStatuses = new Map<number, BookingStatus>();
  const knownStaffBookingIds = new Set<number>();
  const seenStaffQueryHashes = new Set<string>();
  const lastUpdateCountByHash = new Map<string, number>();
  let hasUnfilteredStaffBaseline = false;
  let maxStaffSeenBookingId = 0;
  let maxUnfilteredStaffBookingId = 0;

  const processBookingQuery = (
    query: Query,
    { baselineOnly }: { baselineOnly: boolean },
  ): void => {
    const queryKey = query.queryKey;
    if (!Array.isArray(queryKey) || queryKey[0] !== "bookings") {
      return;
    }

    if (query.state.status !== "success" || query.state.data === undefined) {
      return;
    }

    const previousCount = lastUpdateCountByHash.get(query.queryHash);
    if (previousCount !== undefined && previousCount === query.state.dataUpdateCount) {
      return;
    }
    lastUpdateCountByHash.set(query.queryHash, query.state.dataUpdateCount);

    const role = getState().auth.user?.role;
    if (!role) {
      return;
    }

    const scope = queryKey[1];

    if (scope === "detail" && isBookingRecord(query.state.data)) {
      const booking = query.state.data;
      const prevStatus = knownStatuses.get(booking.id);
      knownStatuses.set(booking.id, booking.status);

      if (!baselineOnly && role === "guest") {
        dispatchGuestBookingStatusNotification(dispatch, booking, prevStatus);
      }
      return;
    }

    if (scope === "my" && isBookingsListResult(query.state.data)) {
      for (const item of query.state.data.data) {
        if (!isBookingRecord(item)) {
          continue;
        }
        const prevStatus = knownStatuses.get(item.id);
        knownStatuses.set(item.id, item.status);

        if (!baselineOnly && role === "guest") {
          dispatchGuestBookingStatusNotification(dispatch, item, prevStatus);
        }
      }
      return;
    }

    if (scope === "list" && isBookingsListResult(query.state.data)) {
      const keyParams = queryKey[2] as BookingsListKeyParams | undefined;
      const isFirstForQuery = !seenStaffQueryHashes.has(query.queryHash);
      const isUnfilteredPageOne = isUnfilteredFirstPageQuery(keyParams);
      seenStaffQueryHashes.add(query.queryHash);

      const previousMaxSeenId = maxStaffSeenBookingId;
      const previousMaxUnfilteredId = maxUnfilteredStaffBookingId;

      for (const item of query.state.data.data) {
        if (!isBookingRecord(item)) {
          continue;
        }

        const isAlreadyKnown = knownStaffBookingIds.has(item.id);
        knownStaffBookingIds.add(item.id);
        if (item.id > maxStaffSeenBookingId) {
          maxStaffSeenBookingId = item.id;
        }
        if (isUnfilteredPageOne && item.id > maxUnfilteredStaffBookingId) {
          maxUnfilteredStaffBookingId = item.id;
        }

        if (baselineOnly || (role !== "staff" && role !== "admin") || isAlreadyKnown) {
          continue;
        }

        const isNewOnExistingQuery = !isFirstForQuery && item.id > previousMaxSeenId;
        const isNewOnCrossViewUnfiltered =
          isFirstForQuery &&
          hasUnfilteredStaffBaseline &&
          isUnfilteredPageOne &&
          item.id > previousMaxUnfilteredId;

        if (isNewOnExistingQuery || isNewOnCrossViewUnfiltered) {
          dispatch(
            addNotification({
              id: `booking-new-${item.id}`,
              type: "booking_new",
              text: `New booking ${bookingReference(item.id)} from ${item.guestName} (${item.roomType} ${item.roomNumber}).`,
              createdAt: new Date().toISOString(),
            }),
          );
        }
      }

      if (isUnfilteredPageOne) {
        hasUnfilteredStaffBaseline = true;
      }
    }
  };

  const existingQueries = queryClient.getQueryCache().findAll({
    queryKey: queryKeys.bookings.all,
  });
  for (const query of existingQueries) {
    processBookingQuery(query, { baselineOnly: true });
  }

  return queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "added" && event.type !== "updated") {
      return;
    }
    if (event.type === "updated" && event.action.type !== "success") {
      return;
    }
    processBookingQuery(event.query, { baselineOnly: false });
  });
}
