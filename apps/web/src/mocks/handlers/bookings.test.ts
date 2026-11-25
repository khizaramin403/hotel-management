import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiClient,
  cancelBooking,
  checkRoomAvailability,
  createBooking,
  getBooking,
  getOccupancyReport,
  getSalesReport,
  listBookings,
  listMyBookings,
  login,
  simulatePayment,
  startBookingPayment,
  updateBookingStatus,
} from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import { getMockBookings, resetMockDb } from "../db";
import { teardownMocks } from "../index";
import { addDaysCalendarDate, getTodayCalendarDateUtc } from "../seed/bookings";

describe("mock bookings module", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth,rooms,bookings");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("seeds 14 bookings across every status with guestName and supports status filtering", async () => {
    const seeded = getMockBookings();
    expect(seeded).toHaveLength(14);
    const statuses = new Set(seeded.map((b) => b.status));
    expect(statuses).toEqual(
      new Set(["pending", "confirmed", "checked_in", "checked_out", "cancelled"]),
    );
    for (const booking of seeded) {
      expect(booking.guestName.length).toBeGreaterThan(0);
    }

    await login({ email: "guest@example.com", password: "Passw0rd!123" });
    const upcoming = await listMyBookings({ status: ["pending", "confirmed", "checked_in"] });
    const past = await listMyBookings({ status: "checked_out" });
    const cancelled = await listMyBookings({ status: "cancelled" });

    expect(upcoming.data.length).toBeGreaterThan(0);
    expect(past.data.length).toBeGreaterThan(0);
    expect(cancelled.data.length).toBeGreaterThan(0);
  });

  it("creates a pending booking with contract totals, enforces Idempotency-Key and replay, and rejects overlaps", async () => {
    await login({ email: "guest@example.com", password: "Passw0rd!123" });

    // Missing Idempotency-Key -> 400
    await expect(
      apiClient.post("/bookings", {
        roomId: 1,
        checkIn: addDaysCalendarDate(getTodayCalendarDateUtc(), 20),
        checkOut: addDaysCalendarDate(getTodayCalendarDateUtc(), 23),
        guests: 1,
      }),
    ).rejects.toMatchObject({ status: 400, code: "IDEMPOTENCY_KEY_REQUIRED" });

    const today = getTodayCalendarDateUtc();
    const checkIn = addDaysCalendarDate(today, 20);
    const checkOut = addDaysCalendarDate(today, 23);

    // Room 5 (201): 15,000/night * 3 nights = 45,000 + 4,500 tax = 49,500
    const created = await createBooking(
      { roomId: 5, checkIn, checkOut, guests: 2 },
      "idem-booking-1",
    );
    expect(created).toMatchObject({
      roomId: 5,
      roomNumber: "201",
      guestName: "Sara Khan",
      nights: 3,
      subtotal: 45000,
      taxAmount: 4500,
      totalPrice: 49500,
      status: "pending",
      payment: null,
    });
    expect(created.expiresAt).not.toBeNull();

    const expiresMs = Date.parse(created.expiresAt ?? "") - Date.parse(created.createdAt);
    expect(expiresMs).toBe(15 * 60 * 1000);

    // Replay same Idempotency-Key -> 200 same booking
    const replayRes = await apiClient.post(
      "/bookings",
      { roomId: 5, checkIn, checkOut, guests: 2 },
      { headers: { "Idempotency-Key": "idem-booking-1" } },
    );
    expect(replayRes.status).toBe(200);
    expect(replayRes.data.data.id).toBe(created.id);

    // Overlapping dates with different Idempotency-Key -> 409 ROOM_NOT_AVAILABLE
    await expect(
      createBooking(
        {
          roomId: 5,
          checkIn: addDaysCalendarDate(today, 21),
          checkOut: addDaysCalendarDate(today, 24),
          guests: 2,
        },
        "idem-booking-2",
      ),
    ).rejects.toMatchObject({ status: 409, code: "ROOM_NOT_AVAILABLE" });

    // Guests exceeding capacity -> 422
    await expect(
      createBooking(
        {
          roomId: 1,
          checkIn: addDaysCalendarDate(today, 20),
          checkOut: addDaysCalendarDate(today, 22),
          guests: 4,
        },
        "idem-booking-3",
      ),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      details: expect.arrayContaining([expect.objectContaining({ field: "guests" })]),
    });
  });

  it("enforces ownership on GET /bookings/:id and cancellation rules", async () => {
    await login({ email: "guest@example.com", password: "Passw0rd!123" });

    // Booking 1039 belongs to Omar Sheikh (userId 4) -> 403
    await expect(getBooking(1039)).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    await expect(cancelBooking(1039)).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });

    // Confirmed paid booking 1041 -> cancelled + payment refunded
    const cancelledConfirmed = await cancelBooking(1041);
    expect(cancelledConfirmed.status).toBe("cancelled");
    expect(cancelledConfirmed.payment?.status).toBe("refunded");

    // Pending booking 1044 -> cancelled
    const cancelledPending = await cancelBooking(1044);
    expect(cancelledPending.status).toBe("cancelled");
    expect(cancelledPending.expiresAt).toBeNull();

    // Checked-in booking 1038 -> 409 INVALID_STATE
    await expect(cancelBooking(1038)).rejects.toMatchObject({
      status: 409,
      code: "INVALID_STATE",
    });
  });

  it("marks pending booking confirmed 2.5 s after payment start and supports dev simulate", async () => {
    vi.useFakeTimers();
    const baseTime = new Date("2026-11-25T10:00:00.000Z");
    vi.setSystemTime(baseTime);
    resetMockDb();

    await login({ email: "guest@example.com", password: "Passw0rd!123" });

    const payment = await startBookingPayment(1044);
    expect(payment.status).toBe("pending");
    expect(payment.amount).toBeGreaterThan(0);

    // Before 2.5 s -> still pending
    await vi.advanceTimersByTimeAsync(2000);
    expect((await getBooking(1044)).status).toBe("pending");

    // At 2.5 s -> paid & confirmed
    await vi.advanceTimersByTimeAsync(500);
    const afterWebhook = await getBooking(1044);
    expect(afterWebhook.status).toBe("confirmed");
    expect(afterWebhook.expiresAt).toBeNull();
    expect(afterWebhook.payment?.status).toBe("paid");

    // Paying non-pending booking -> 409 INVALID_STATE
    await expect(startBookingPayment(1044)).rejects.toMatchObject({
      status: 409,
      code: "INVALID_STATE",
    });

    // Test dev simulate endpoint on booking 1043's pending payment (510)
    const pendingBooking = await getBooking(1043);
    const pendingPaymentId = pendingBooking.payment?.id;
    expect(pendingPaymentId).toBeDefined();

    const simResult = await simulatePayment(pendingPaymentId!, { status: "paid" });
    expect(simResult.received).toBe(true);
    const simulated = await getBooking(1043);
    expect(simulated.status).toBe("confirmed");
    expect(simulated.payment?.status).toBe("paid");
  });

  it("expires stale pending bookings when expiresAt has passed on read", async () => {
    vi.useFakeTimers();
    const baseTime = new Date("2026-11-25T10:00:00.000Z");
    vi.setSystemTime(baseTime);
    resetMockDb();

    await login({ email: "guest@example.com", password: "Passw0rd!123" });
    const checkIn = addDaysCalendarDate("2026-11-25", 20);
    const checkOut = addDaysCalendarDate("2026-11-25", 22);

    const created = await createBooking(
      { roomId: 5, checkIn, checkOut, guests: 2 },
      "idem-expiry-1",
    );
    expect((await checkRoomAvailability(5, { checkIn, checkOut })).available).toBe(false);

    // Advance 16 minutes -> expired on next read
    await vi.advanceTimersByTimeAsync(16 * 60 * 1000);

    const expired = await getBooking(created.id);
    expect(expired.status).toBe("cancelled");
    expect(expired.expiresAt).toBeNull();
    expect((await checkRoomAvailability(5, { checkIn, checkOut })).available).toBe(true);
  });

  it("enforces staff/admin list filters, status transitions, and admin report totals", async () => {
    await login({ email: "guest@example.com", password: "Passw0rd!123" });
    await expect(listBookings()).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    await expect(updateBookingStatus(1040, { status: "checked_in" })).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });

    // Staff can list, search with q, and transition confirmed -> checked_in -> checked_out
    await login({ email: "staff@example.com", password: "Passw0rd!123" });
    const allBookings = await listBookings({ limit: 50 });
    expect(allBookings.meta.total).toBe(14);

    const searchByRef = await listBookings({ q: "BK-1041" });
    expect(searchByRef.data.map((b) => b.id)).toEqual([1041]);

    const searchByGuest = await listBookings({ q: "Omar" });
    expect(searchByGuest.data.length).toBeGreaterThan(0);
    expect(searchByGuest.data.every((b) => b.guestName.includes("Omar"))).toBe(true);

    // Invalid transitions -> 409 INVALID_STATE
    await expect(updateBookingStatus(1043, { status: "checked_in" })).rejects.toMatchObject({
      status: 409,
      code: "INVALID_STATE",
    });
    await expect(updateBookingStatus(1040, { status: "checked_out" })).rejects.toMatchObject({
      status: 409,
      code: "INVALID_STATE",
    });

    const checkedIn = await updateBookingStatus(1040, { status: "checked_in" });
    expect(checkedIn.status).toBe("checked_in");
    const checkedOut = await updateBookingStatus(1040, { status: "checked_out" });
    expect(checkedOut.status).toBe("checked_out");

    // Staff cannot view reports -> 403
    const today = getTodayCalendarDateUtc();
    const from = addDaysCalendarDate(today, -15);
    const to = addDaysCalendarDate(today, 15);
    await expect(getSalesReport({ from, to })).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });

    // Admin sales and occupancy reports compute directly from mock bookings
    await login({ email: "admin@example.com", password: "Passw0rd!123" });
    const sales = await getSalesReport({ from, to });
    const expectedRevenueBookings = getMockBookings().filter(
      (b) =>
        (b.status === "confirmed" || b.status === "checked_in" || b.status === "checked_out") &&
        b.checkIn >= from &&
        b.checkIn <= to,
    );
    const expectedTotalRevenue = expectedRevenueBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    expect(sales.bookingCount).toBe(expectedRevenueBookings.length);
    expect(sales.totalRevenue).toBe(expectedTotalRevenue);
    expect(sales.daily.reduce((sum, d) => sum + d.revenue, 0)).toBe(expectedTotalRevenue);

    const occupancy = await getOccupancyReport({ from, to });
    expect(occupancy.availableRoomNights).toBe(occupancy.daily.length * 12);
    expect(occupancy.roomNights).toBeGreaterThan(0);
    expect(occupancy.occupancyRate).toBeGreaterThan(0);
  });
});
