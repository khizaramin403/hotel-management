import type { Booking } from "@hotel/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRoomAvailability,
  createRoom,
  createRoomImageUploadUrl,
  deactivateRoom,
  deleteRoomImage,
  getRoom,
  listRooms,
  login,
  saveRoomImage,
  setRoomImageCover,
  updateRoom,
} from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import { addMockBooking, resetMockDb } from "../db";
import { teardownMocks } from "../index";

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 100,
    userId: 1,
    guestName: "Sara Khan",
    roomId: 5,
    roomNumber: "201",
    roomType: "Deluxe",
    checkIn: "2026-12-20",
    checkOut: "2026-12-23",
    guests: 2,
    nights: 3,
    subtotal: 45000,
    taxAmount: 4500,
    totalPrice: 49500,
    status: "confirmed",
    expiresAt: null,
    createdAt: "2026-11-25T10:00:00.000Z",
    payment: { id: 1, status: "paid" },
    ...overrides,
  };
}

describe("mock rooms module", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth,rooms");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    vi.stubEnv("NEXT_PUBLIC_IMAGE_BASE_URL", "/images");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
  });

  afterEach(() => {
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("seeds 12 rooms in contract order with expected prices and image URLs", async () => {
    const result = await listRooms({ page: 1, limit: 12 });
    expect(result.data.map((r) => r.number)).toEqual([
      "101",
      "102",
      "103",
      "104",
      "201",
      "202",
      "203",
      "204",
      "301",
      "302",
      "210",
      "211",
    ]);
    expect(result.meta).toEqual({ page: 1, limit: 12, total: 12, totalPages: 1 });

    for (const room of result.data) {
      expect(room.pricePerNight).toBeGreaterThanOrEqual(6000);
      expect(room.pricePerNight).toBeLessThanOrEqual(30000);
    }

    const firstDetail = await getRoom(1);
    expect(firstDetail.images).toHaveLength(3);
    expect(firstDetail.coverImage?.key).toBe("rooms/room-01-1.webp");
    expect(firstDetail.coverImage?.isCover).toBe(true);
    expect(firstDetail.coverImage?.urls).toEqual({
      sm: "/images/rooms/room-01-1.webp",
      md: "/images/rooms/room-01-1.webp",
      lg: "/images/rooms/room-01-1.webp",
    });

    const twelfthDetail = await getRoom(12);
    expect(twelfthDetail.number).toBe("211");
    expect(twelfthDetail.type).toBe("Family");
    expect(twelfthDetail.images[2]?.key).toBe("rooms/room-12-3.webp");
  });

  it("filters by type, price range, guests, dates, sort, and pagination meta", async () => {
    const deluxe = await listRooms({ type: "Deluxe", minPrice: 16000, maxPrice: 18000 });
    expect(deluxe.data.map((r) => r.number)).toEqual(["202", "203"]);

    const largeCapacity = await listRooms({ guests: 4, sort: "price_desc" });
    expect(largeCapacity.data.map((r) => r.number)).toEqual(["302", "211", "210"]);

    const byPriceAsc = await listRooms({ sort: "price_asc", page: 2, limit: 4 });
    expect(byPriceAsc.meta).toEqual({ page: 2, limit: 4, total: 12, totalPages: 3 });
    expect(byPriceAsc.data.map((r) => r.number)).toEqual(["201", "202", "203", "204"]);

    const byNumber = await listRooms({ sort: "number", limit: 12 });
    expect(byNumber.data.map((r) => r.number)).toEqual([
      "101",
      "102",
      "103",
      "104",
      "201",
      "202",
      "203",
      "204",
      "210",
      "211",
      "301",
      "302",
    ]);

    // Overlap check: non-cancelled booking on room 5 (201), cancelled booking on room 6 (202)
    addMockBooking(
      makeBooking({
        id: 1,
        roomId: 5,
        status: "confirmed",
        checkIn: "2026-12-20",
        checkOut: "2026-12-23",
      }),
    );
    addMockBooking(
      makeBooking({
        id: 2,
        roomId: 6,
        status: "cancelled",
        checkIn: "2026-12-20",
        checkOut: "2026-12-23",
      }),
    );

    const available = await listRooms({ checkIn: "2026-12-21", checkOut: "2026-12-24", limit: 12 });
    expect(available.data.some((r) => r.id === 5)).toBe(false);
    expect(available.data.some((r) => r.id === 6)).toBe(true);

    // Adjacent checkout === checkIn does not overlap
    const adjacent = await listRooms({ checkIn: "2026-12-23", checkOut: "2026-12-25", limit: 12 });
    expect(adjacent.data.some((r) => r.id === 5)).toBe(true);
  });

  it("validates query params and returns 422 with details", async () => {
    await expect(listRooms({ checkIn: "2026-12-20" })).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      details: expect.arrayContaining([expect.objectContaining({ field: "checkOut" })]),
    });

    await expect(listRooms({ minPrice: 20000, maxPrice: 10000 })).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      details: expect.arrayContaining([expect.objectContaining({ field: "maxPrice" })]),
    });
  });

  it("computes availability and 10% rounded tax totals", async () => {
    // Room 5 (201): 15,000/night -> 3 nights = 45,000 + 4,500 = 49,500
    const available = await checkRoomAvailability(5, {
      checkIn: "2026-12-20",
      checkOut: "2026-12-23",
    });
    expect(available).toEqual({
      available: true,
      nights: 3,
      subtotal: 45000,
      taxAmount: 4500,
      totalPrice: 49500,
    });

    addMockBooking(
      makeBooking({
        id: 11,
        roomId: 5,
        status: "pending",
        checkIn: "2026-12-20",
        checkOut: "2026-12-23",
      }),
    );

    const unavailable = await checkRoomAvailability(5, {
      checkIn: "2026-12-22",
      checkOut: "2026-12-24",
    });
    expect(unavailable).toEqual({
      available: false,
      nights: 2,
      subtotal: 30000,
      taxAmount: 3000,
      totalPrice: 33000,
    });

    await expect(
      checkRoomAvailability(5, { checkIn: "2026-12-23", checkOut: "2026-12-20" }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      details: expect.arrayContaining([expect.objectContaining({ field: "checkOut" })]),
    });

    await expect(
      checkRoomAvailability(999, { checkIn: "2026-12-20", checkOut: "2026-12-21" }),
    ).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("enforces admin-only rules, duplicate room number 409, soft delete 404 visibility, and image endpoints", async () => {
    const validPayload = {
      number: "401",
      type: "Suite" as const,
      pricePerNight: 28000,
      capacity: 4,
      facilities: ["Wi-Fi", "Balcony"],
      description: "Top-floor quiet suite.",
    };

    // Logged out -> 401
    await expect(createRoom(validPayload)).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
    await expect(updateRoom(1, { pricePerNight: 7000 })).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
    await expect(deactivateRoom(1)).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });

    // Staff -> 403
    await login({ email: "staff@example.com", password: "Passw0rd!123" });
    await expect(createRoom(validPayload)).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
    await expect(createRoomImageUploadUrl(1, { fileType: "image/webp" })).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });

    // Admin -> CRUD + 409 + 422 + image management
    await login({ email: "admin@example.com", password: "Passw0rd!123" });

    await expect(
      createRoom({
        number: "",
        type: "Suite",
        pricePerNight: -10,
        capacity: 0,
        facilities: [],
        description: "",
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      details: expect.arrayContaining([
        expect.objectContaining({ field: "number" }),
        expect.objectContaining({ field: "pricePerNight" }),
      ]),
    });

    await expect(createRoom({ ...validPayload, number: "101" })).rejects.toMatchObject({
      status: 409,
      code: "ROOM_NUMBER_TAKEN",
    });

    const created = await createRoom(validPayload);
    expect(created).toMatchObject({
      id: 13,
      number: "401",
      isActive: true,
      images: [],
      coverImage: null,
    });

    await expect(updateRoom(created.id, { number: "201" })).rejects.toMatchObject({
      status: 409,
      code: "ROOM_NUMBER_TAKEN",
    });

    const updated = await updateRoom(created.id, { pricePerNight: 29500 });
    expect(updated.pricePerNight).toBe(29500);

    const upload = await createRoomImageUploadUrl(created.id, { fileType: "image/webp" });
    expect(upload.uploadUrl).toContain("https://mock-s3.local/upload/");
    expect(upload.key).toMatch(/^rooms\/room-13-.*\.webp$/);

    const savedImg = await saveRoomImage(created.id, { key: upload.key, isCover: true });
    expect(savedImg.isCover).toBe(true);
    expect(savedImg.urls.sm).toBe(`/images/${upload.key}`);

    const secondUpload = await createRoomImageUploadUrl(created.id, { fileType: "image/jpeg" });
    const secondImg = await saveRoomImage(created.id, { key: secondUpload.key, isCover: false });
    expect(secondImg.isCover).toBe(false);

    const promoted = await setRoomImageCover(created.id, secondImg.id);
    expect(promoted.isCover).toBe(true);
    expect((await getRoom(created.id)).coverImage?.id).toBe(secondImg.id);

    await expect(setRoomImageCover(created.id, 99999)).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });

    await deleteRoomImage(created.id, savedImg.id);
    await deleteRoomImage(created.id, secondImg.id);
    const afterImgDelete = await getRoom(created.id);
    expect(afterImgDelete.images).toHaveLength(0);
    expect(afterImgDelete.coverImage).toBeNull();

    // Soft delete hides room from public/non-admin, remains visible to admin with includeInactive
    await deactivateRoom(created.id);

    const adminList = await listRooms({ includeInactive: true, limit: 20 });
    expect(adminList.data.some((r) => r.id === created.id && !r.isActive)).toBe(true);
    expect((await getRoom(created.id)).isActive).toBe(false);

    const adminInactiveOnly = await listRooms({ includeInactive: true, isActive: false, limit: 20 });
    expect(adminInactiveOnly.data.map((r) => r.id)).toEqual([created.id]);

    const adminSearch = await listRooms({ includeInactive: true, q: "401", limit: 20 });
    expect(adminSearch.data.map((r) => r.id)).toEqual([created.id]);

    await login({ email: "guest@example.com", password: "Passw0rd!123" });
    const publicList = await listRooms({ includeInactive: true, isActive: false, limit: 20 });
    expect(publicList.data.some((r) => r.id === created.id)).toBe(false);
    await expect(getRoom(created.id)).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });
});
