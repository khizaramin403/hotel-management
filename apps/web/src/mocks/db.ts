import {
  calcTotals,
  ERROR_CODE,
  nightsBetween,
  type Booking,
  type Conversation,
  type ErrorCode,
  type ErrorResponse,
  type Image,
  type Message,
  type PaginationMeta,
  type Payment,
  type Role,
  type RoomDetail,
  type User,
  type ValidationErrorDetail,
} from "@hotel/shared";
import type { AxiosRequestConfig } from "axios";
import type { z } from "zod";
import { extractRequestId } from "@/lib/api/errors";
import { createSeedBookings } from "./seed/bookings";
import { createSeedChat } from "./seed/chat";
import { buildRoomImageUrls, cloneRoomDetail, createSeedRooms } from "./seed/rooms";

const DEFAULT_MOCK_LATENCY_MS = 400;
const MOCK_ROLE_COOKIE_NAME = "mock_role";
const PENDING_EXPIRY_MS = 15 * 60 * 1000;
const MOCK_WEBHOOK_DELAY_MS = 2500;

export interface MockUserRecord extends User {
  password: string;
  createdAt: string;
}

const SEED_USERS: readonly MockUserRecord[] = [
  {
    id: 1,
    name: "Sara Khan",
    email: "guest@example.com",
    password: "Passw0rd!123",
    role: "guest",
    createdAt: "2026-11-18T08:00:00.000Z",
  },
  {
    id: 2,
    name: "Ali Raza",
    email: "staff@example.com",
    password: "Passw0rd!123",
    role: "staff",
    createdAt: "2026-11-19T09:30:00.000Z",
  },
  {
    id: 3,
    name: "Hina Malik",
    email: "admin@example.com",
    password: "Passw0rd!123",
    role: "admin",
    createdAt: "2026-11-18T07:00:00.000Z",
  },
  {
    id: 4,
    name: "Omar Sheikh",
    email: "guest2@example.com",
    password: "Passw0rd!123",
    role: "guest",
    createdAt: "2026-11-20T14:15:00.000Z",
  },
  {
    id: 5,
    name: "Zara Ahmed",
    email: "guest3@example.com",
    password: "Passw0rd!123",
    role: "guest",
    createdAt: "2026-11-21T10:00:00.000Z",
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
  payments: Payment[];
  nextBookingId: number;
  nextPaymentId: number;
  idempotencyIndex: Map<string, number>;
  paymentTimers: Map<number, ReturnType<typeof setTimeout>>;
  conversations: Conversation[];
  messages: Message[];
  nextConversationId: number;
  nextMessageId: number;
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

const initialSeedUsers = SEED_USERS.map((user) => ({ ...user }));
const initialSeedRooms = createSeedRooms();
const initialBookingsBundle = createSeedBookings(initialSeedUsers, initialSeedRooms);
const initialChatBundle = createSeedChat(initialSeedUsers);

const dbState: MockDbState = {
  users: initialSeedUsers,
  nextUserId: 6,
  currentUserId: null,
  rooms: initialSeedRooms,
  nextRoomId: initialSeedRooms.length + 1,
  nextImageId: getMaxImageId(initialSeedRooms) + 1,
  bookings: initialBookingsBundle.bookings,
  payments: initialBookingsBundle.payments,
  nextBookingId: initialBookingsBundle.nextBookingId,
  nextPaymentId: initialBookingsBundle.nextPaymentId,
  idempotencyIndex: new Map(),
  paymentTimers: new Map(),
  conversations: initialChatBundle.conversations,
  messages: initialChatBundle.messages,
  nextConversationId: initialChatBundle.nextConversationId,
  nextMessageId: initialChatBundle.nextMessageId,
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

export function clearMockPaymentTimers(): void {
  for (const timer of dbState.paymentTimers.values()) {
    clearTimeout(timer);
  }
  dbState.paymentTimers.clear();
}

export function resetMockDb(): void {
  clearMockPaymentTimers();
  const freshUsers = SEED_USERS.map((user) => ({ ...user }));
  const freshRooms = createSeedRooms();
  const freshBookings = createSeedBookings(freshUsers, freshRooms);
  const freshChat = createSeedChat(freshUsers);

  dbState.users = freshUsers;
  dbState.nextUserId = 6;
  dbState.currentUserId = null;
  dbState.rooms = freshRooms;
  dbState.nextRoomId = freshRooms.length + 1;
  dbState.nextImageId = getMaxImageId(freshRooms) + 1;
  dbState.bookings = freshBookings.bookings;
  dbState.payments = freshBookings.payments;
  dbState.nextBookingId = freshBookings.nextBookingId;
  dbState.nextPaymentId = freshBookings.nextPaymentId;
  dbState.idempotencyIndex.clear();
  dbState.conversations = freshChat.conversations;
  dbState.messages = freshChat.messages;
  dbState.nextConversationId = freshChat.nextConversationId;
  dbState.nextMessageId = freshChat.nextMessageId;
  clearMockRoleCookie();
}

export function toPublicUser(user: MockUserRecord): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
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
    createdAt: new Date().toISOString(),
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

export function requireRole(
  config: AxiosRequestConfig,
  allowedRoles: readonly Role[],
): { user: MockUserRecord } | { error: ReturnType<typeof mockError> } {
  const auth = requireAuthenticated(config);
  if ("error" in auth) {
    return auth;
  }
  if (!allowedRoles.includes(auth.user.role)) {
    return {
      error: mockError(403, ERROR_CODE.FORBIDDEN, "Access denied", config),
    };
  }
  return auth;
}

export function requireAdmin(
  config: AxiosRequestConfig,
): { user: MockUserRecord } | { error: ReturnType<typeof mockError> } {
  return requireRole(config, ["admin"]);
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

export function setMockRoomCoverImage(roomId: number, imageId: number): Image | null {
  const room = findMockRoomById(roomId);
  if (!room) {
    return null;
  }

  const target = room.images.find((img) => img.id === imageId);
  if (!target) {
    return null;
  }

  for (const img of room.images) {
    img.isCover = img.id === imageId;
  }
  room.coverImage = target;

  return { ...target, urls: { ...target.urls } };
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

export function cloneBooking(booking: Booking): Booking {
  return {
    ...booking,
    payment: booking.payment ? { ...booking.payment } : null,
  };
}

export function expireStalePendingBookings(nowMs: number = Date.now()): void {
  for (const booking of dbState.bookings) {
    if (booking.status !== "pending" || booking.expiresAt === null) {
      continue;
    }
    const expiresMs = Date.parse(booking.expiresAt);
    if (!Number.isNaN(expiresMs) && expiresMs <= nowMs) {
      booking.status = "cancelled";
      booking.expiresAt = null;
      if (booking.payment && booking.payment.status === "pending") {
        const payment = dbState.payments.find((p) => p.id === booking.payment?.id);
        if (payment) {
          payment.status = "failed";
        }
        booking.payment = { id: booking.payment.id, status: "failed" };
      }
    }
  }
}

export function getMockBookings(): Booking[] {
  expireStalePendingBookings();
  return dbState.bookings;
}

export function findMockBookingById(id: number): Booking | undefined {
  expireStalePendingBookings();
  return dbState.bookings.find((booking) => booking.id === id);
}

export function findMockBookingByIdempotency(
  userId: number,
  idempotencyKey: string,
): Booking | undefined {
  expireStalePendingBookings();
  const bookingId = dbState.idempotencyIndex.get(`${userId}:${idempotencyKey}`);
  if (bookingId === undefined) {
    return undefined;
  }
  return dbState.bookings.find((booking) => booking.id === bookingId);
}

export function addMockBooking(booking: Booking): void {
  dbState.bookings.push(booking);
}

export function createMockBooking(params: {
  user: MockUserRecord;
  room: RoomDetail;
  checkIn: string;
  checkOut: string;
  guests: number;
  idempotencyKey: string;
  nowMs?: number;
}): Booking {
  const nowMs = params.nowMs ?? Date.now();
  const nights = nightsBetween(params.checkIn, params.checkOut);
  const { subtotal, taxAmount, totalPrice } = calcTotals(nights, params.room.pricePerNight);

  const created: Booking = {
    id: dbState.nextBookingId,
    userId: params.user.id,
    guestName: params.user.name,
    roomId: params.room.id,
    roomNumber: params.room.number,
    roomType: params.room.type,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    guests: params.guests,
    nights,
    subtotal,
    taxAmount,
    totalPrice,
    status: "pending",
    expiresAt: new Date(nowMs + PENDING_EXPIRY_MS).toISOString(),
    createdAt: new Date(nowMs).toISOString(),
    payment: null,
  };

  dbState.nextBookingId += 1;
  dbState.bookings.push(created);
  dbState.idempotencyIndex.set(`${params.user.id}:${params.idempotencyKey}`, created.id);
  return cloneBooking(created);
}

export function isRoomAvailableForDates(
  roomId: number,
  checkIn: string,
  checkOut: string,
): boolean {
  expireStalePendingBookings();
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

export function findMockPaymentById(paymentId: number): Payment | undefined {
  return dbState.payments.find((payment) => payment.id === paymentId);
}

export function applyPaymentOutcome(
  paymentId: number,
  status: "paid" | "failed",
  providerRefPrefix: string,
): boolean {
  const payment = findMockPaymentById(paymentId);
  if (!payment) {
    return false;
  }

  const pendingTimer = dbState.paymentTimers.get(paymentId);
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    dbState.paymentTimers.delete(paymentId);
  }

  if (payment.status !== "pending") {
    return true;
  }

  payment.status = status;
  payment.providerRef = `${providerRefPrefix}_${payment.id}`;

  const booking = dbState.bookings.find((b) => b.id === payment.bookingId);
  if (booking) {
    if (status === "paid" && booking.status === "pending") {
      booking.status = "confirmed";
      booking.expiresAt = null;
    }
    booking.payment = { id: payment.id, status: payment.status };
  }

  return true;
}

export function startMockBookingPayment(booking: Booking): Payment {
  const payment: Payment = {
    id: dbState.nextPaymentId,
    bookingId: booking.id,
    amount: booking.totalPrice,
    status: "pending",
    providerRef: null,
  };
  dbState.nextPaymentId += 1;
  dbState.payments.push(payment);
  booking.payment = { id: payment.id, status: "pending" };

  const timer = setTimeout(() => {
    dbState.paymentTimers.delete(payment.id);
    expireStalePendingBookings();
    applyPaymentOutcome(payment.id, "paid", "mock_webhook");
  }, MOCK_WEBHOOK_DELAY_MS);
  dbState.paymentTimers.set(payment.id, timer);

  return { ...payment };
}

export function markMockBookingPaidAndRefundIfPaid(booking: Booking): void {
  if (booking.payment && booking.payment.status === "paid") {
    const payment = findMockPaymentById(booking.payment.id);
    if (payment) {
      payment.status = "refunded";
    }
    booking.payment = { id: booking.payment.id, status: "refunded" };
  } else if (booking.payment && booking.payment.status === "pending") {
    const timer = dbState.paymentTimers.get(booking.payment.id);
    if (timer) {
      clearTimeout(timer);
      dbState.paymentTimers.delete(booking.payment.id);
    }
    const payment = findMockPaymentById(booking.payment.id);
    if (payment) {
      payment.status = "failed";
    }
    booking.payment = { id: booking.payment.id, status: "failed" };
  }
}

export function cloneConversation(conversation: Conversation): Conversation {
  return {
    ...conversation,
    lastMessage: conversation.lastMessage ? { ...conversation.lastMessage } : null,
  };
}

export function cloneMessage(message: Message): Message {
  return { ...message };
}

export function getMockConversations(): Conversation[] {
  return dbState.conversations;
}

export function getMockMessages(): Message[] {
  return dbState.messages;
}

export function findMockConversationById(id: number): Conversation | undefined {
  return dbState.conversations.find((conversation) => conversation.id === id);
}

export function findOpenMockConversationByGuestId(guestId: number): Conversation | undefined {
  return dbState.conversations.find(
    (conversation) => conversation.guestId === guestId && conversation.status === "open",
  );
}

export function createOrGetMockConversation(guest: Pick<User, "id" | "name">): Conversation {
  const existing = findOpenMockConversationByGuestId(guest.id);
  if (existing) {
    return cloneConversation(existing);
  }

  const created: Conversation = {
    id: dbState.nextConversationId,
    guestId: guest.id,
    guestName: guest.name,
    staffId: null,
    status: "open",
    lastMessage: null,
    unreadCount: 0,
  };
  dbState.nextConversationId += 1;
  dbState.conversations.push(created);
  return cloneConversation(created);
}

export function getMockMessagesForConversation(conversationId: number): Message[] {
  return dbState.messages
    .filter((message) => message.conversationId === conversationId)
    .sort((a, b) => b.id - a.id);
}

export function appendMockChatMessage(input: {
  conversationId: number;
  senderId: number;
  senderRole: Role;
  text: string;
  incrementUnread?: boolean;
}): { message: Message; conversation: Conversation } | null {
  const conversation = findMockConversationById(input.conversationId);
  if (!conversation) {
    return null;
  }

  const message: Message = {
    id: dbState.nextMessageId,
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderRole: input.senderRole,
    text: input.text,
    createdAt: new Date().toISOString(),
  };
  dbState.nextMessageId += 1;
  dbState.messages.push(message);

  conversation.lastMessage = {
    text: message.text,
    createdAt: message.createdAt,
  };
  if (input.senderRole === "staff" || input.senderRole === "admin") {
    conversation.staffId = input.senderId;
  }
  if (input.incrementUnread) {
    conversation.unreadCount += 1;
  }

  return {
    message: cloneMessage(message),
    conversation: cloneConversation(conversation),
  };
}

export function markMockConversationRead(conversationId: number): Conversation | null {
  const conversation = findMockConversationById(conversationId);
  if (!conversation) {
    return null;
  }
  conversation.unreadCount = 0;
  return cloneConversation(conversation);
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
