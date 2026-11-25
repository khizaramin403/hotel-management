import {
  bookingsQuerySchema,
  canTransitionBookingStatus,
  createBookingSchema,
  ERROR_CODE,
  idParamSchema,
  reportQuerySchema,
  setStatusSchema,
  simulatePaymentSchema,
  type Booking,
  type BookingStatus,
} from "@hotel/shared";
import type { AxiosRequestConfig } from "axios";
import type MockAdapter from "axios-mock-adapter";
import {
  applyPaymentOutcome,
  cloneBooking,
  createMockBooking,
  findMockBookingById,
  findMockBookingByIdempotency,
  findMockPaymentById,
  findMockRoomById,
  getMockBookings,
  getMockRooms,
  isRoomAvailableForDates,
  markMockBookingPaidAndRefundIfPaid,
  mockError,
  paginatedEnvelope,
  parseJsonBody,
  requireAdmin,
  requireAuthenticated,
  requireRole,
  responseHeadersForRequest,
  startMockBookingPayment,
  successEnvelope,
  zodIssuesToDetails,
} from "../db";
import { addDaysCalendarDate, getTodayCalendarDateUtc } from "../seed/bookings";

const REVENUE_STATUSES = new Set<BookingStatus>(["confirmed", "checked_in", "checked_out"]);

function getPathname(url: string | undefined): string {
  return (url ?? "").split("?")[0] ?? "";
}

function getHeaderCaseInsensitive(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") {
    return undefined;
  }

  if ("get" in headers && typeof headers.get === "function") {
    const val = (headers.get as (headerName: string) => unknown)(name);
    if (typeof val === "string" && val.trim().length > 0) {
      return val.trim();
    }
  }

  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target && typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function filterBookingsList(
  bookings: readonly Booking[],
  query: {
    status?: BookingStatus[];
    from?: string;
    to?: string;
    q?: string;
  },
): Booking[] {
  let result = [...bookings];

  if (query.status && query.status.length > 0) {
    const allowed = new Set<BookingStatus>(query.status);
    result = result.filter((booking) => allowed.has(booking.status));
  }

  if (query.from !== undefined) {
    const from = query.from;
    result = result.filter((booking) => booking.checkIn >= from);
  }

  if (query.to !== undefined) {
    const to = query.to;
    result = result.filter((booking) => booking.checkIn <= to);
  }

  if (query.q !== undefined) {
    const needle = query.q.trim().toLowerCase();
    result = result.filter((booking) => {
      const ref = `bk-${booking.id}`;
      return (
        ref.includes(needle) ||
        String(booking.id).includes(needle) ||
        booking.guestName.toLowerCase().includes(needle) ||
        booking.roomNumber.toLowerCase().includes(needle)
      );
    });
  }

  result.sort((a, b) => b.id - a.id);
  return result;
}

function buildDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 400) {
    dates.push(cursor);
    cursor = addDaysCalendarDate(cursor, 1);
    guard += 1;
  }
  return dates;
}

function parseBookingIdParam(
  url: string | undefined,
  pattern: RegExp,
  config: AxiosRequestConfig,
): { id: number } | { error: ReturnType<typeof mockError> } {
  const match = pattern.exec(getPathname(url));
  const parsed = idParamSchema.safeParse({ id: match?.[1] });
  if (!parsed.success) {
    return {
      error: mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid booking id",
        config,
        zodIssuesToDetails(parsed.error),
      ),
    };
  }
  return { id: parsed.data.id };
}

export function registerBookingHandlers(mock: MockAdapter): void {
  // Specific GET routes before /bookings/:id
  mock.onGet("/bookings/my").reply((config) => {
    const auth = requireRole(config, ["guest"]);
    if ("error" in auth) {
      return auth.error;
    }

    const parsedQuery = bookingsQuerySchema.safeParse(config.params ?? {});
    if (!parsedQuery.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid query parameters",
        config,
        zodIssuesToDetails(parsedQuery.error),
      );
    }

    const ownBookings = getMockBookings().filter((booking) => booking.userId === auth.user.id);
    const filtered = filterBookingsList(ownBookings, parsedQuery.data).map(cloneBooking);

    return [
      200,
      paginatedEnvelope(filtered, parsedQuery.data.page, parsedQuery.data.limit),
      responseHeadersForRequest(config),
    ];
  });

  mock.onGet("/bookings/reports/sales").reply((config) => {
    const auth = requireAdmin(config);
    if ("error" in auth) {
      return auth.error;
    }

    const parsedQuery = reportQuerySchema.safeParse(config.params ?? {});
    if (!parsedQuery.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid report query",
        config,
        zodIssuesToDetails(parsedQuery.error),
      );
    }

    const { from, to } = parsedQuery.data;
    const revenueBookings = getMockBookings().filter(
      (booking) =>
        REVENUE_STATUSES.has(booking.status) && booking.checkIn >= from && booking.checkIn <= to,
    );

    const byDate = new Map<string, { revenue: number; bookings: number }>();
    for (const date of buildDateRange(from, to)) {
      byDate.set(date, { revenue: 0, bookings: 0 });
    }

    let totalRevenue = 0;
    for (const booking of revenueBookings) {
      totalRevenue += booking.totalPrice;
      const bucket = byDate.get(booking.checkIn);
      if (bucket) {
        bucket.revenue += booking.totalPrice;
        bucket.bookings += 1;
      }
    }

    const daily = Array.from(byDate.entries()).map(([date, stats]) => ({
      date,
      revenue: stats.revenue,
      bookings: stats.bookings,
    }));

    return [
      200,
      successEnvelope({
        from,
        to,
        totalRevenue,
        bookingCount: revenueBookings.length,
        daily,
      }),
      responseHeadersForRequest(config),
    ];
  });

  mock.onGet("/bookings/reports/occupancy").reply((config) => {
    const auth = requireAdmin(config);
    if ("error" in auth) {
      return auth.error;
    }

    const parsedQuery = reportQuerySchema.safeParse(config.params ?? {});
    if (!parsedQuery.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid report query",
        config,
        zodIssuesToDetails(parsedQuery.error),
      );
    }

    const { from, to } = parsedQuery.data;
    const activeRoomsCount = getMockRooms().filter((room) => room.isActive).length;
    const activeBookings = getMockBookings().filter((booking) =>
      REVENUE_STATUSES.has(booking.status),
    );
    const dates = buildDateRange(from, to);

    let roomNights = 0;
    const daily = dates.map((date) => {
      const occupiedRoomIds = new Set<number>();
      for (const booking of activeBookings) {
        if (booking.checkIn <= date && date < booking.checkOut) {
          occupiedRoomIds.add(booking.roomId);
        }
      }
      const occupiedRooms = occupiedRoomIds.size;
      roomNights += occupiedRooms;
      const rate =
        activeRoomsCount > 0 ? Math.round((occupiedRooms / activeRoomsCount) * 1000) / 10 : 0;

      return {
        date,
        occupiedRooms,
        rate,
      };
    });

    const availableRoomNights = dates.length * activeRoomsCount;
    const occupancyRate =
      availableRoomNights > 0 ? Math.round((roomNights / availableRoomNights) * 1000) / 10 : 0;

    return [
      200,
      successEnvelope({
        from,
        to,
        occupancyRate,
        roomNights,
        availableRoomNights,
        daily,
      }),
      responseHeadersForRequest(config),
    ];
  });

  mock.onGet("/bookings").reply((config) => {
    const auth = requireRole(config, ["staff", "admin"]);
    if ("error" in auth) {
      return auth.error;
    }

    const parsedQuery = bookingsQuerySchema.safeParse(config.params ?? {});
    if (!parsedQuery.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid query parameters",
        config,
        zodIssuesToDetails(parsedQuery.error),
      );
    }

    const filtered = filterBookingsList(getMockBookings(), parsedQuery.data).map(cloneBooking);
    return [
      200,
      paginatedEnvelope(filtered, parsedQuery.data.page, parsedQuery.data.limit),
      responseHeadersForRequest(config),
    ];
  });

  mock.onGet(/\/bookings\/([^/?]+)$/).reply((config) => {
    const auth = requireAuthenticated(config);
    if ("error" in auth) {
      return auth.error;
    }

    const idResult = parseBookingIdParam(config.url, /\/bookings\/([^/?]+)$/, config);
    if ("error" in idResult) {
      return idResult.error;
    }

    const booking = findMockBookingById(idResult.id);
    if (!booking) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Booking not found", config);
    }

    if (auth.user.role === "guest" && booking.userId !== auth.user.id) {
      return mockError(403, ERROR_CODE.FORBIDDEN, "Access denied", config);
    }

    return [200, successEnvelope(cloneBooking(booking)), responseHeadersForRequest(config)];
  });

  mock.onPost("/bookings").reply((config) => {
    const auth = requireRole(config, ["guest"]);
    if ("error" in auth) {
      return auth.error;
    }

    const idempotencyKey = getHeaderCaseInsensitive(config.headers, "idempotency-key");
    if (!idempotencyKey) {
      return mockError(
        400,
        ERROR_CODE.IDEMPOTENCY_KEY_REQUIRED,
        "Idempotency-Key header is required",
        config,
      );
    }

    const replayed = findMockBookingByIdempotency(auth.user.id, idempotencyKey);
    if (replayed) {
      return [200, successEnvelope(cloneBooking(replayed)), responseHeadersForRequest(config)];
    }

    const body = parseJsonBody(config.data);
    if (body === null) {
      return mockError(400, ERROR_CODE.BAD_REQUEST, "Malformed JSON", config);
    }

    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid input",
        config,
        zodIssuesToDetails(parsed.error),
      );
    }

    const { roomId, checkIn, checkOut, guests } = parsed.data;
    const today = getTodayCalendarDateUtc();
    if (checkIn < today) {
      return mockError(422, ERROR_CODE.VALIDATION_ERROR, "Invalid input", config, [
        { field: "checkIn", message: "Check-in date cannot be in the past" },
      ]);
    }

    const room = findMockRoomById(roomId);
    if (!room || !room.isActive) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Room not found", config);
    }

    if (guests > room.capacity) {
      return mockError(422, ERROR_CODE.VALIDATION_ERROR, "Invalid input", config, [
        { field: "guests", message: `Room capacity is ${room.capacity} guests` },
      ]);
    }

    if (!isRoomAvailableForDates(room.id, checkIn, checkOut)) {
      return mockError(
        409,
        ERROR_CODE.ROOM_NOT_AVAILABLE,
        "Room is not available for these dates",
        config,
      );
    }

    const created = createMockBooking({
      user: auth.user,
      room,
      checkIn,
      checkOut,
      guests,
      idempotencyKey,
    });

    return [201, successEnvelope(created), responseHeadersForRequest(config)];
  });

  mock.onPatch(/\/bookings\/([^/?]+)\/cancel$/).reply((config) => {
    const auth = requireAuthenticated(config);
    if ("error" in auth) {
      return auth.error;
    }

    const idResult = parseBookingIdParam(config.url, /\/bookings\/([^/?]+)\/cancel$/, config);
    if ("error" in idResult) {
      return idResult.error;
    }

    const booking = findMockBookingById(idResult.id);
    if (!booking) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Booking not found", config);
    }

    if (auth.user.role === "guest" && booking.userId !== auth.user.id) {
      return mockError(403, ERROR_CODE.FORBIDDEN, "Access denied", config);
    }

    if (!canTransitionBookingStatus(booking.status, "cancelled")) {
      return mockError(
        409,
        ERROR_CODE.INVALID_STATE,
        "Booking cannot be cancelled in its current status",
        config,
      );
    }

    booking.status = "cancelled";
    booking.expiresAt = null;
    markMockBookingPaidAndRefundIfPaid(booking);

    return [200, successEnvelope(cloneBooking(booking)), responseHeadersForRequest(config)];
  });

  mock.onPost(/\/bookings\/([^/?]+)\/pay$/).reply((config) => {
    const auth = requireAuthenticated(config);
    if ("error" in auth) {
      return auth.error;
    }

    const idResult = parseBookingIdParam(config.url, /\/bookings\/([^/?]+)\/pay$/, config);
    if ("error" in idResult) {
      return idResult.error;
    }

    const booking = findMockBookingById(idResult.id);
    if (!booking) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Booking not found", config);
    }

    if (booking.userId !== auth.user.id) {
      return mockError(403, ERROR_CODE.FORBIDDEN, "Access denied", config);
    }

    if (booking.status !== "pending") {
      return mockError(409, ERROR_CODE.INVALID_STATE, "Only pending bookings can be paid", config);
    }

    const payment = startMockBookingPayment(booking);
    return [
      200,
      successEnvelope({
        paymentId: payment.id,
        amount: payment.amount,
        status: payment.status,
      }),
      responseHeadersForRequest(config),
    ];
  });

  mock.onPatch(/\/bookings\/([^/?]+)\/status$/).reply((config) => {
    const auth = requireRole(config, ["staff", "admin"]);
    if ("error" in auth) {
      return auth.error;
    }

    const idResult = parseBookingIdParam(config.url, /\/bookings\/([^/?]+)\/status$/, config);
    if ("error" in idResult) {
      return idResult.error;
    }

    const body = parseJsonBody(config.data);
    if (body === null) {
      return mockError(400, ERROR_CODE.BAD_REQUEST, "Malformed JSON", config);
    }

    const parsedBody = setStatusSchema.safeParse(body);
    if (!parsedBody.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid status update",
        config,
        zodIssuesToDetails(parsedBody.error),
      );
    }

    const booking = findMockBookingById(idResult.id);
    if (!booking) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Booking not found", config);
    }

    if (!canTransitionBookingStatus(booking.status, parsedBody.data.status)) {
      return mockError(
        409,
        ERROR_CODE.INVALID_STATE,
        `Cannot transition booking from ${booking.status} to ${parsedBody.data.status}`,
        config,
      );
    }

    booking.status = parsedBody.data.status;
    return [200, successEnvelope(cloneBooking(booking)), responseHeadersForRequest(config)];
  });

  mock.onPost(/\/bookings\/dev\/payments\/([^/?]+)\/simulate$/).reply((config) => {
    const match = /\/bookings\/dev\/payments\/([^/?]+)\/simulate$/.exec(getPathname(config.url));
    const parsedId = idParamSchema.safeParse({ id: match?.[1] });
    if (!parsedId.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid payment id",
        config,
        zodIssuesToDetails(parsedId.error),
      );
    }

    const body = parseJsonBody(config.data);
    if (body === null) {
      return mockError(400, ERROR_CODE.BAD_REQUEST, "Malformed JSON", config);
    }

    const parsedBody = simulatePaymentSchema.safeParse(body);
    if (!parsedBody.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid simulation payload",
        config,
        zodIssuesToDetails(parsedBody.error),
      );
    }

    const payment = findMockPaymentById(parsedId.data.id);
    if (!payment) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Payment not found", config);
    }

    applyPaymentOutcome(payment.id, parsedBody.data.status, "dev_sim");
    return [200, successEnvelope({ received: true }), responseHeadersForRequest(config)];
  });
}
