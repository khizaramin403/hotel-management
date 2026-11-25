import {
  ERROR_CODE,
  type Booking,
  type ErrorCode,
  type ErrorResponse,
  type Image,
  type PaginationMeta,
  type Role,
  type RoomDetail,
  type User,
  type ValidationErrorDetail,
} from "@hotel/shared";
import type { AxiosRequestConfig } from "axios";
import type { z } from "zod";
import { extractRequestId } from "@/lib/api/errors";
import { buildRoomImageUrls, cloneRoomDetail, createSeedRooms } from "./seed/rooms";

const DEFAULT_MOCK_LATENCY_MS = 400;
const MOCK_ROLE_COOKIE_NAME = "mock_role";

export interface MockUserRecord extends User {
  password: string;
}

const SEED_USERS: readonly MockUserRecord[] = [
  {
    id: 1,
    name: "Sara Khan",
    email: "guest@example.com",
    password: "Passw0rd!123",
    role: "guest",
  },
  {
    id: 2,
    name: "Ali Raza",
    email: "staff@example.com",
    password: "Passw0rd!123",
    role: "staff",
  },
  {
    id: 3,
    name: "Hina Malik",
    email: "admin@example.com",
    password: "Passw0rd!123",
    role: "admin",
  },
];

interface MockDbState {
  users: MockUserRecord[];
  nextUserId: number;
  currentUserId: number | null;
  rooms: RoomDetail[];
  nextRoomId: number;
  nextImageId: number;
  bookings: Booking[];
}

function getMaxImageId(rooms: readonly RoomDetail[]): number {
  let maxId = 0;
  for (const room of rooms) {
    for (const img of room.images) {
      if (img.id > maxId) {
        maxId = img.id;
      }
    }
  }
  return maxId;
}

const initialSeedRooms = createSeedRooms();

const dbState: MockDbState = {
  users: SEED_USERS.map((user) => ({ ...user })),
  nextUserId: 4,
  currentUserId: null,
  rooms: initialSeedRooms,
  nextRoomId: initialSeedRooms.length + 1,
  nextImageId: getMaxImageId(initialSeedRooms) + 1,
  bookings: [],
};

export function getMockLatencyMs(): number {
  const raw = process.env.NEXT_PUBLIC_MOCK_LATENCY?.trim();
  if (!raw) {
    return DEFAULT_MOCK_LATENCY_MS;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_MOCK_LATENCY_MS;
  }
  return Math.floor(parsed);
}

export function setMockRoleCookie(role: Role): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${MOCK_ROLE_COOKIE_NAME}=${role}; path=/; SameSite=Lax`;
}

export function clearMockRoleCookie(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${MOCK_ROLE_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function readMockRoleCookie(): Role | null {
  if (typeof document === "undefined" || !document.cookie) {
    return null;
  }
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const [rawName, rawValue] = part.trim().split("=");
    if (rawName === MOCK_ROLE_COOKIE_NAME) {
      if (rawValue === "guest" || rawValue === "staff" || rawValue === "admin") {
        return rawValue;
      }
    }
  }
  return null;
}

export function resetMockDb(): void {
  const freshRooms = createSeedRooms();
  dbState.users = SEED_USERS.map((user) => ({ ...user }));
  dbState.nextUserId = 4;
  dbState.currentUserId = null;
  dbState.rooms = freshRooms;
  dbState.nextRoomId = freshRooms.length + 1;
  dbState.nextImageId = getMaxImageId(freshRooms) + 1;
  dbState.bookings = [];
  clearMockRoleCookie();
}

export function toPublicUser(user: MockUserRecord): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export function getMockUsers(): MockUserRecord[] {
  return dbState.users;
}

export function findMockUserByEmail(email: string): MockUserRecord | undefined {
  const normalized = email.trim().toLowerCase();
  return dbState.users.find((user) => user.email.toLowerCase() === normalized);
}

export function createMockUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): MockUserRecord {
  const record: MockUserRecord = {
    id: dbState.nextUserId,
    name: input.name,
    email: input.email,
    password: input.password,
    role: input.role,
  };
  dbState.nextUserId += 1;
  dbState.users.push(record);
  return record;
}

export function deleteMockUserById(id: number, role?: Role): boolean {
  const index = dbState.users.findIndex(
    (user) => user.id === id && (role === undefined || user.role === role),
  );
  if (index === -1) {
    return false;
  }
  dbState.users.splice(index, 1);
  if (dbState.currentUserId === id) {
    dbState.currentUserId = null;
    clearMockRoleCookie();
  }
  return true;
}

export function setCurrentSessionUser(user: MockUserRecord | null): void {
  dbState.currentUserId = user ? user.id : null;
  if (user) {
    setMockRoleCookie(user.role);
  } else {
    clearMockRoleCookie();
  }
}

export function getCurrentSessionUser(): MockUserRecord | null {
  if (dbState.currentUserId !== null) {
    return dbState.users.find((user) => user.id === dbState.currentUserId) ?? null;
  }

  const cookieRole = readMockRoleCookie();
  if (cookieRole) {
    const restored = dbState.users.find((user) => user.role === cookieRole) ?? null;
    if (restored) {
      dbState.currentUserId = restored.id;
    }
    return restored;
  }

  return null;
}

export function requireAuthenticated(
  config: AxiosRequestConfig,
): { user: MockUserRecord } | { error: ReturnType<typeof mockError> } {
  const user = getCurrentSessionUser();
  if (!user) {
    return {
      error: mockError(401, ERROR_CODE.UNAUTHENTICATED, "Authentication required", config),
    };
  }
  return { user };
}

export function requireAdmin(
  config: AxiosRequestConfig,
): { user: MockUserRecord } | { error: ReturnType<typeof mockError> } {
  const auth = requireAuthenticated(config);
  if ("error" in auth) {
    return auth;
  }
  if (auth.user.role !== "admin") {
    return {
      error: mockError(403, ERROR_CODE.FORBIDDEN, "Access denied", config),
    };
  }
  return auth;
}

export function getMockRooms(): RoomDetail[] {
  return dbState.rooms;
}

export function findMockRoomById(id: number): RoomDetail | undefined {
  return dbState.rooms.find((room) => room.id === id);
}

export function findMockRoomByNumber(
  number: string,
  excludeRoomId?: number,
): RoomDetail | undefined {
  const normalized = number.trim().toLowerCase();
  return dbState.rooms.find(
    (room) => room.number.trim().toLowerCase() === normalized && room.id !== excludeRoomId,
  );
}

export function createMockRoom(input: {
  number: string;
  type: RoomDetail["type"];
  pricePerNight: number;
  capacity: number;
  facilities: string[];
  description: string;
}): RoomDetail {
  const created: RoomDetail = {
    id: dbState.nextRoomId,
    number: input.number.trim(),
    type: input.type,
    pricePerNight: input.pricePerNight,
    capacity: input.capacity,
    facilities: [...input.facilities],
    description: input.description.trim(),
    isActive: true,
    coverImage: null,
    images: [],
  };
  dbState.nextRoomId += 1;
  dbState.rooms.push(created);
  return cloneRoomDetail(created);
}

export function addMockRoomImage(roomId: number, key: string, isCover: boolean): Image | null {
  const room = findMockRoomById(roomId);
  if (!room) {
    return null;
  }

  if (isCover) {
    for (const existing of room.images) {
      existing.isCover = false;
    }
  }

  const shouldBeCover = isCover || room.images.length === 0;
  const image: Image = {
    id: dbState.nextImageId,
    key: key.trim(),
    isCover: shouldBeCover,
    sortOrder: room.images.length,
    urls: buildRoomImageUrls(key.trim()),
  };
  dbState.nextImageId += 1;
  room.images.push(image);
  room.coverImage = room.images.find((img) => img.isCover) ?? room.images[0] ?? null;

  return { ...image, urls: { ...image.urls } };
}

export function deleteMockRoomImage(roomId: number, imageId: number): boolean {
  const room = findMockRoomById(roomId);
  if (!room) {
    return false;
  }

  const idx = room.images.findIndex((img) => img.id === imageId);
  if (idx === -1) {
    return false;
  }

  const [removed] = room.images.splice(idx, 1);
  if (removed?.isCover && room.images[0]) {
    room.images[0].isCover = true;
  }
  room.images.forEach((img, index) => {
    img.sortOrder = index;
  });
  room.coverImage = room.images.find((img) => img.isCover) ?? room.images[0] ?? null;
  return true;
}

export function getMockBookings(): Booking[] {
  return dbState.bookings;
}

export function addMockBooking(booking: Booking): void {
  dbState.bookings.push(booking);
}

export function isRoomAvailableForDates(
  roomId: number,
  checkIn: string,
  checkOut: string,
): boolean {
  for (const booking of dbState.bookings) {
    if (booking.roomId !== roomId || booking.status === "cancelled") {
      continue;
    }
    if (booking.checkIn < checkOut && booking.checkOut > checkIn) {
      return false;
    }
  }
  return true;
}

export function successEnvelope<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export function paginatedEnvelope<T>(
  items: readonly T[],
  page: number,
  limit: number,
): { success: true; data: T[]; meta: PaginationMeta } {
  const start = (page - 1) * limit;
  const pagedItems = items.slice(start, start + limit);
  return {
    success: true,
    data: pagedItems,
    meta: buildPaginationMeta(items.length, page, limit),
  };
}

export function errorEnvelope(
  code: ErrorCode,
  message: string,
  details?: ValidationErrorDetail[],
): ErrorResponse {
  return {
    success: false,
    error: details !== undefined ? { code, message, details } : { code, message },
  };
}

export function zodIssuesToDetails(error: z.ZodError): ValidationErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));
}

export function responseHeadersForRequest(
  config: AxiosRequestConfig,
): Record<string, string> | undefined {
  const requestId = extractRequestId(config.headers);
  return requestId ? { "x-request-id": requestId } : undefined;
}

export function mockError(
  status: number,
  code: ErrorCode,
  message: string,
  config: AxiosRequestConfig,
  details?: ValidationErrorDetail[],
): [number, ErrorResponse, Record<string, string> | undefined] {
  return [status, errorEnvelope(code, message, details), responseHeadersForRequest(config)];
}

export function parseJsonBody(rawData: unknown): unknown {
  if (typeof rawData === "string") {
    if (rawData.trim().length === 0) {
      return {};
    }
    try {
      return JSON.parse(rawData) as unknown;
    } catch {
      return null;
    }
  }
  return rawData ?? {};
}
