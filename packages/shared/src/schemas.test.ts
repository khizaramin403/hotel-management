import { describe, expect, it } from "vitest";
import {
  bookingsQuerySchema,
  createBookingSchema,
  createRoomSchema,
  errorResponseSchema,
  guestDetailsSchema,
  loginSchema,
  paginatedResponseSchema,
  paymentWebhookSchema,
  pushSubscriptionSchema,
  registerSchema,
  roomSchema,
  roomsQuerySchema,
  sendMessageSchema,
  updateRoomImageSchema,
  updateRoomSchema,
  userSchema,
} from "./schemas/index";

describe("registerSchema", () => {
  it("accepts valid registration input", () => {
    const res = registerSchema.safeParse({
      name: "  Amina Khan ",
      email: "amina@example.com",
      password: "Password1",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.name).toBe("Amina Khan");
    }
  });

  it("rejects short name, invalid email, and weak passwords", () => {
    expect(
      registerSchema.safeParse({ name: "A", email: "amina@example.com", password: "Password1" })
        .success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ name: "Amina", email: "not-an-email", password: "Password1" })
        .success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ name: "Amina", email: "amina@example.com", password: "short1" })
        .success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        name: "Amina",
        email: "amina@example.com",
        password: "onlyletters",
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ name: "Amina", email: "amina@example.com", password: "12345678" })
        .success,
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(
      loginSchema.safeParse({ email: "guest@example.com", password: "Passw0rd!123" }).success,
    ).toBe(true);
  });

  it("rejects invalid email or empty password", () => {
    expect(loginSchema.safeParse({ email: "bad-email", password: "secret" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "guest@example.com", password: "" }).success).toBe(false);
  });
});

describe("createBookingSchema", () => {
  it("accepts valid booking within 1..30 nights and 1..8 guests", () => {
    expect(
      createBookingSchema.safeParse({
        roomId: 1,
        checkIn: "2026-12-01",
        checkOut: "2026-12-05",
        guests: 2,
      }).success,
    ).toBe(true);

    expect(
      createBookingSchema.safeParse({
        roomId: 2,
        checkIn: "2026-12-01",
        checkOut: "2026-12-31",
        guests: 8,
      }).success,
    ).toBe(true);
  });

  it("rejects checkOut same as or before checkIn", () => {
    expect(
      createBookingSchema.safeParse({
        roomId: 1,
        checkIn: "2026-12-05",
        checkOut: "2026-12-05",
        guests: 2,
      }).success,
    ).toBe(false);

    expect(
      createBookingSchema.safeParse({
        roomId: 1,
        checkIn: "2026-12-05",
        checkOut: "2026-12-03",
        guests: 2,
      }).success,
    ).toBe(false);
  });

  it("rejects stays longer than 30 nights", () => {
    const res = createBookingSchema.safeParse({
      roomId: 1,
      checkIn: "2026-12-01",
      checkOut: "2027-01-01",
      guests: 2,
    });
    expect(res.success).toBe(false);
  });

  it("rejects guests outside 1..8 or non-integer values", () => {
    expect(
      createBookingSchema.safeParse({
        roomId: 1,
        checkIn: "2026-12-01",
        checkOut: "2026-12-03",
        guests: 0,
      }).success,
    ).toBe(false);

    expect(
      createBookingSchema.safeParse({
        roomId: 1,
        checkIn: "2026-12-01",
        checkOut: "2026-12-03",
        guests: 9,
      }).success,
    ).toBe(false);

    expect(
      createBookingSchema.safeParse({
        roomId: 1,
        checkIn: "2026-12-01",
        checkOut: "2026-12-03",
        guests: 1.5,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid calendar dates", () => {
    expect(
      createBookingSchema.safeParse({
        roomId: 1,
        checkIn: "2026-02-30",
        checkOut: "2026-03-02",
        guests: 1,
      }).success,
    ).toBe(false);
  });
});

describe("guestDetailsSchema", () => {
  it("accepts valid guest details with empty optional specialRequests and trims fields", () => {
    const res = guestDetailsSchema.safeParse({
      fullName: "  Sara Khan  ",
      phone: " +92 300 0000000 ",
      email: "sara@example.com",
      specialRequests: "",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.fullName).toBe("Sara Khan");
      expect(res.data.phone).toBe("+92 300 0000000");
    }
  });

  it("rejects short full name, invalid phone, or invalid email", () => {
    expect(
      guestDetailsSchema.safeParse({
        fullName: "A",
        phone: "+92 300 0000000",
        email: "sara@example.com",
        specialRequests: "",
      }).success,
    ).toBe(false);

    expect(
      guestDetailsSchema.safeParse({
        fullName: "Sara Khan",
        phone: "123",
        email: "sara@example.com",
        specialRequests: "",
      }).success,
    ).toBe(false);

    expect(
      guestDetailsSchema.safeParse({
        fullName: "Sara Khan",
        phone: "+92 300 0000000",
        email: "not-an-email",
        specialRequests: "",
      }).success,
    ).toBe(false);
  });
});

describe("createRoomSchema & updateRoomSchema", () => {
  it("accepts valid room payload", () => {
    expect(
      createRoomSchema.safeParse({
        number: "201",
        type: "Deluxe",
        pricePerNight: 15000,
        capacity: 3,
        facilities: ["Wi-Fi", "AC"],
        description: "Spacious room with city view.",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid room type, non-integer price, or zero capacity", () => {
    expect(
      createRoomSchema.safeParse({
        number: "201",
        type: "Penthouse",
        pricePerNight: 15000,
        capacity: 2,
        facilities: [],
        description: "Nice",
      }).success,
    ).toBe(false);

    expect(
      createRoomSchema.safeParse({
        number: "201",
        type: "Deluxe",
        pricePerNight: 150.5,
        capacity: 2,
        facilities: [],
        description: "Nice",
      }).success,
    ).toBe(false);

    expect(
      createRoomSchema.safeParse({
        number: "201",
        type: "Deluxe",
        pricePerNight: 15000,
        capacity: 0,
        facilities: [],
        description: "Nice",
      }).success,
    ).toBe(false);
  });

  it("supports partial updates with isActive and room cover image updates", () => {
    expect(updateRoomSchema.safeParse({ pricePerNight: 18000, isActive: false }).success).toBe(
      true,
    );
    expect(updateRoomImageSchema.safeParse({ isCover: true }).success).toBe(true);
    expect(updateRoomImageSchema.safeParse({ isCover: false }).success).toBe(false);
  });
});

describe("additional contract schemas", () => {
  it("parses query params and comma-separated booking statuses", () => {
    const rooms = roomsQuerySchema.parse({
      q: " 201 ",
      includeInactive: "true",
      isActive: "false",
      page: "2",
      limit: "20",
    });
    expect(rooms.q).toBe("201");
    expect(rooms.includeInactive).toBe(true);
    expect(rooms.isActive).toBe(false);
    expect(rooms.page).toBe(2);
    expect(rooms.limit).toBe(20);

    const bookings = bookingsQuerySchema.parse({ status: "pending,confirmed" });
    expect(bookings.status).toEqual(["pending", "confirmed"]);
  });

  it("validates envelope, webhook, message, and push subscription schemas", () => {
    expect(
      paginatedResponseSchema(roomSchema).safeParse({
        success: true,
        data: [
          {
            id: 1,
            number: "101",
            type: "Single",
            pricePerNight: 6000,
            capacity: 1,
            facilities: ["Wi-Fi"],
            description: "Cozy room",
            isActive: true,
            coverImage: null,
          },
        ],
        meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
      }).success,
    ).toBe(true);

    expect(
      errorResponseSchema.safeParse({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: [{ field: "email", message: "Invalid email" }],
        },
      }).success,
    ).toBe(true);

    expect(
      paymentWebhookSchema.safeParse({
        paymentId: 10,
        bookingId: 5,
        status: "paid",
        providerRef: "demo_123",
      }).success,
    ).toBe(true);

    expect(sendMessageSchema.safeParse({ conversationId: 1, text: "Hello!" }).success).toBe(true);
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: "https://push.example.com/sub/1",
        keys: { p256dh: "key1", auth: "auth1" },
      }).success,
    ).toBe(true);

    expect(
      userSchema.safeParse({
        id: 2,
        name: "Ali Raza",
        email: "staff@example.com",
        role: "staff",
        createdAt: "2026-11-20T09:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      userSchema.safeParse({
        id: 2,
        name: "Ali Raza",
        email: "staff@example.com",
        role: "staff",
      }).success,
    ).toBe(true);
  });
});
