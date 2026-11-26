import {
  availabilityQuerySchema,
  calcTotals,
  createRoomSchema,
  ERROR_CODE,
  idParamSchema,
  nightsBetween,
  roomsQuerySchema,
  saveImageSchema,
  updateRoomSchema,
  uploadUrlSchema,
} from "@hotel/shared";
import type MockAdapter from "axios-mock-adapter";
import {
  addMockRoomImage,
  createMockRoom,
  deleteMockRoomImage,
  findMockRoomById,
  findMockRoomByNumber,
  getCurrentSessionUser,
  getMockRooms,
  isRoomAvailableForDates,
  mockError,
  paginatedEnvelope,
  parseJsonBody,
  requireAdmin,
  responseHeadersForRequest,
  successEnvelope,
  zodIssuesToDetails,
} from "../db";
import { cloneRoomDetail, toRoomSummary } from "../seed/rooms";

const FILE_EXTENSION_BY_TYPE: Record<"image/jpeg" | "image/png" | "image/webp", string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getPathname(url: string | undefined): string {
  return (url ?? "").split("?")[0] ?? "";
}

export function registerRoomHandlers(mock: MockAdapter): void {
  mock.onGet("/rooms").reply((config) => {
    const parsedQuery = roomsQuerySchema.safeParse(config.params ?? {});
    if (!parsedQuery.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid query parameters",
        config,
        zodIssuesToDetails(parsedQuery.error),
      );
    }

    const query = parsedQuery.data;
    const isAdmin = getCurrentSessionUser()?.role === "admin";
    const includeInactive = isAdmin && query.includeInactive === true;

    let rooms = getMockRooms().filter((room) => includeInactive || room.isActive);

    if (isAdmin && includeInactive && query.isActive !== undefined) {
      rooms = rooms.filter((room) => room.isActive === query.isActive);
    }
    if (query.q !== undefined) {
      const needle = query.q.trim().toLowerCase();
      rooms = rooms.filter((room) => room.number.toLowerCase().includes(needle));
    }
    if (query.type !== undefined) {
      rooms = rooms.filter((room) => room.type === query.type);
    }
    if (query.minPrice !== undefined) {
      rooms = rooms.filter((room) => room.pricePerNight >= query.minPrice!);
    }
    if (query.maxPrice !== undefined) {
      rooms = rooms.filter((room) => room.pricePerNight <= query.maxPrice!);
    }
    if (query.guests !== undefined) {
      rooms = rooms.filter((room) => room.capacity >= query.guests!);
    }
    if (query.checkIn !== undefined && query.checkOut !== undefined) {
      const checkIn = query.checkIn;
      const checkOut = query.checkOut;
      rooms = rooms.filter((room) => isRoomAvailableForDates(room.id, checkIn, checkOut));
    }

    const sorted = [...rooms];
    if (query.sort === "price_asc") {
      sorted.sort((a, b) => a.pricePerNight - b.pricePerNight || a.id - b.id);
    } else if (query.sort === "price_desc") {
      sorted.sort((a, b) => b.pricePerNight - a.pricePerNight || a.id - b.id);
    } else if (query.sort === "number") {
      sorted.sort((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));
    }

    return [
      200,
      paginatedEnvelope(sorted.map(toRoomSummary), query.page, query.limit),
      responseHeadersForRequest(config),
    ];
  });

  mock.onGet(/\/rooms\/([^/?]+)\/availability$/).reply((config) => {
    const match = /\/rooms\/([^/?]+)\/availability$/.exec(getPathname(config.url));
    const parsedId = idParamSchema.safeParse({ id: match?.[1] });
    if (!parsedId.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid room id",
        config,
        zodIssuesToDetails(parsedId.error),
      );
    }

    const parsedQuery = availabilityQuerySchema.safeParse(config.params ?? {});
    if (!parsedQuery.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid availability query",
        config,
        zodIssuesToDetails(parsedQuery.error),
      );
    }

    const room = findMockRoomById(parsedId.data.id);
    if (!room || !room.isActive) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Room not found", config);
    }

    const { checkIn, checkOut } = parsedQuery.data;
    const nights = nightsBetween(checkIn, checkOut);
    const { subtotal, taxAmount, totalPrice } = calcTotals(nights, room.pricePerNight);
    const available = isRoomAvailableForDates(room.id, checkIn, checkOut);

    return [
      200,
      successEnvelope({ available, nights, subtotal, taxAmount, totalPrice }),
      responseHeadersForRequest(config),
    ];
  });

  mock.onGet(/\/rooms\/([^/?]+)$/).reply((config) => {
    const match = /\/rooms\/([^/?]+)$/.exec(getPathname(config.url));
    const parsedId = idParamSchema.safeParse({ id: match?.[1] });
    if (!parsedId.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid room id",
        config,
        zodIssuesToDetails(parsedId.error),
      );
    }

    const room = findMockRoomById(parsedId.data.id);
    const isAdmin = getCurrentSessionUser()?.role === "admin";
    if (!room || (!room.isActive && !isAdmin)) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Room not found", config);
    }

    return [200, successEnvelope(cloneRoomDetail(room)), responseHeadersForRequest(config)];
  });

  mock.onPost("/rooms").reply((config) => {
    const auth = requireAdmin(config);
    if ("error" in auth) {
      return auth.error;
    }

    const body = parseJsonBody(config.data);
    if (body === null) {
      return mockError(400, ERROR_CODE.BAD_REQUEST, "Malformed JSON", config);
    }

    const parsed = createRoomSchema.safeParse(body);
    if (!parsed.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid input",
        config,
        zodIssuesToDetails(parsed.error),
      );
    }

    if (findMockRoomByNumber(parsed.data.number)) {
      return mockError(
        409,
        ERROR_CODE.ROOM_NUMBER_TAKEN,
        "A room with this number already exists",
        config,
      );
    }

    const created = createMockRoom(parsed.data);
    return [201, successEnvelope(created), responseHeadersForRequest(config)];
  });

  mock.onPatch(/\/rooms\/([^/?]+)$/).reply((config) => {
    const auth = requireAdmin(config);
    if ("error" in auth) {
      return auth.error;
    }

    const match = /\/rooms\/([^/?]+)$/.exec(getPathname(config.url));
    const parsedId = idParamSchema.safeParse({ id: match?.[1] });
    if (!parsedId.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid room id",
        config,
        zodIssuesToDetails(parsedId.error),
      );
    }

    const room = findMockRoomById(parsedId.data.id);
    if (!room) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Room not found", config);
    }

    const body = parseJsonBody(config.data);
    if (body === null) {
      return mockError(400, ERROR_CODE.BAD_REQUEST, "Malformed JSON", config);
    }

    const parsed = updateRoomSchema.safeParse(body);
    if (!parsed.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid input",
        config,
        zodIssuesToDetails(parsed.error),
      );
    }

    const updates = parsed.data;
    if (updates.number !== undefined && findMockRoomByNumber(updates.number, room.id)) {
      return mockError(
        409,
        ERROR_CODE.ROOM_NUMBER_TAKEN,
        "A room with this number already exists",
        config,
      );
    }

    if (updates.number !== undefined) room.number = updates.number.trim();
    if (updates.type !== undefined) room.type = updates.type;
    if (updates.pricePerNight !== undefined) room.pricePerNight = updates.pricePerNight;
    if (updates.capacity !== undefined) room.capacity = updates.capacity;
    if (updates.facilities !== undefined) room.facilities = [...updates.facilities];
    if (updates.description !== undefined) room.description = updates.description.trim();
    if (updates.isActive !== undefined) room.isActive = updates.isActive;

    return [200, successEnvelope(cloneRoomDetail(room)), responseHeadersForRequest(config)];
  });

  mock.onDelete(/\/rooms\/([^/?]+)\/images\/([^/?]+)$/).reply((config) => {
    const auth = requireAdmin(config);
    if ("error" in auth) {
      return auth.error;
    }

    const match = /\/rooms\/([^/?]+)\/images\/([^/?]+)$/.exec(getPathname(config.url));
    const parsedRoomId = idParamSchema.safeParse({ id: match?.[1] });
    const parsedImageId = idParamSchema.safeParse({ id: match?.[2] });
    if (!parsedRoomId.success || !parsedImageId.success) {
      return mockError(422, ERROR_CODE.VALIDATION_ERROR, "Invalid room or image id", config);
    }

    const room = findMockRoomById(parsedRoomId.data.id);
    if (!room) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Room not found", config);
    }

    const deleted = deleteMockRoomImage(room.id, parsedImageId.data.id);
    if (!deleted) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Image not found", config);
    }

    return [204, undefined, responseHeadersForRequest(config)];
  });

  mock.onDelete(/\/rooms\/([^/?]+)$/).reply((config) => {
    const auth = requireAdmin(config);
    if ("error" in auth) {
      return auth.error;
    }

    const match = /\/rooms\/([^/?]+)$/.exec(getPathname(config.url));
    const parsedId = idParamSchema.safeParse({ id: match?.[1] });
    if (!parsedId.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid room id",
        config,
        zodIssuesToDetails(parsedId.error),
      );
    }

    const room = findMockRoomById(parsedId.data.id);
    if (!room) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Room not found", config);
    }

    room.isActive = false;
    return [204, undefined, responseHeadersForRequest(config)];
  });

  mock.onPost(/\/rooms\/([^/?]+)\/images\/upload-url$/).reply((config) => {
    const auth = requireAdmin(config);
    if ("error" in auth) {
      return auth.error;
    }

    const match = /\/rooms\/([^/?]+)\/images\/upload-url$/.exec(getPathname(config.url));
    const parsedId = idParamSchema.safeParse({ id: match?.[1] });
    if (!parsedId.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid room id",
        config,
        zodIssuesToDetails(parsedId.error),
      );
    }

    const room = findMockRoomById(parsedId.data.id);
    if (!room) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Room not found", config);
    }

    const body = parseJsonBody(config.data);
    if (body === null) {
      return mockError(400, ERROR_CODE.BAD_REQUEST, "Malformed JSON", config);
    }

    const parsed = uploadUrlSchema.safeParse(body);
    if (!parsed.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid upload request",
        config,
        zodIssuesToDetails(parsed.error),
      );
    }

    const ext = FILE_EXTENSION_BY_TYPE[parsed.data.fileType];
    const suffix =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID().slice(0, 8)
        : String(Date.now());
    const key = `rooms/room-${String(room.id).padStart(2, "0")}-${suffix}.${ext}`;
    const uploadUrl = `https://mock-s3.local/upload/${key}?presigned=1`;

    return [200, successEnvelope({ uploadUrl, key }), responseHeadersForRequest(config)];
  });

  mock.onPost(/\/rooms\/([^/?]+)\/images$/).reply((config) => {
    const auth = requireAdmin(config);
    if ("error" in auth) {
      return auth.error;
    }

    const match = /\/rooms\/([^/?]+)\/images$/.exec(getPathname(config.url));
    const parsedId = idParamSchema.safeParse({ id: match?.[1] });
    if (!parsedId.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid room id",
        config,
        zodIssuesToDetails(parsedId.error),
      );
    }

    const room = findMockRoomById(parsedId.data.id);
    if (!room) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Room not found", config);
    }

    const body = parseJsonBody(config.data);
    if (body === null) {
      return mockError(400, ERROR_CODE.BAD_REQUEST, "Malformed JSON", config);
    }

    const parsed = saveImageSchema.safeParse(body);
    if (!parsed.success) {
      return mockError(
        422,
        ERROR_CODE.VALIDATION_ERROR,
        "Invalid image data",
        config,
        zodIssuesToDetails(parsed.error),
      );
    }

    const saved = addMockRoomImage(room.id, parsed.data.key, parsed.data.isCover);
    if (!saved) {
      return mockError(404, ERROR_CODE.NOT_FOUND, "Room not found", config);
    }

    return [201, successEnvelope(saved), responseHeadersForRequest(config)];
  });
}
