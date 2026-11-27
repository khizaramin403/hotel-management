import type { Conversation, Message } from "@hotel/shared";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys, type ConversationsListResult, type MessagesListResult } from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import { resetMockDb, setCurrentSessionUser, getMockUsers } from "@/mocks/db";
import {
  MOCK_CALL_ANSWER_DELAY_MS,
  MOCK_STAFF_REPLY_DELAY_MS,
  MOCK_STAFF_TYPING_DELAY_MS,
  MockSocket,
} from "@/mocks/socket";

const mockIoInstance = {
  connected: false,
  connect: vi.fn(() => {
    mockIoInstance.connected = true;
  }),
  disconnect: vi.fn(() => {
    mockIoInstance.connected = false;
  }),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  timeout: vi.fn(() => ({
    emitWithAck: vi.fn().mockResolvedValue({
      id: 999,
      conversationId: 1,
      senderId: 1,
      senderRole: "guest",
      text: "Real ack",
      createdAt: "2026-11-27T10:00:00.000Z",
    }),
  })),
};

const mockIoFactory = vi.fn<
  (url: string, options?: Record<string, unknown>) => typeof mockIoInstance
>(() => mockIoInstance);

vi.mock("socket.io-client", () => ({
  io: (url: string, options?: Record<string, unknown>) => mockIoFactory(url, options),
}));

import {
  createSocketClient,
  getSocketUrl,
  isChatMockEnabled,
  RealSocket,
  upsertConversationInCache,
  upsertMessageInCache,
} from "./index";

describe("SocketClient abstraction and MockSocket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIoInstance.connected = false;
    resetMockInitForTests();
    resetMockDb();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("selects MockSocket when chat mocks are enabled and RealSocket otherwise", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth,chat");
    expect(isChatMockEnabled()).toBe(true);
    expect(createSocketClient()).toBeInstanceOf(MockSocket);

    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth,rooms");
    expect(isChatMockEnabled()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
    vi.stubEnv("NEXT_PUBLIC_SOCKET_URL", "https://chat.hotel.example.com");
    expect(getSocketUrl()).toBe("https://chat.hotel.example.com");

    const client = createSocketClient();
    expect(client).toBeInstanceOf(RealSocket);
    expect(mockIoFactory).toHaveBeenCalledWith("https://chat.hotel.example.com", {
      path: "/socket.io",
      withCredentials: true,
      autoConnect: false,
    });
  });

  it("RealSocket connects, listens, emits non-ack events, and sends message:send with ack", async () => {
    const socket = new RealSocket("http://localhost:8080");
    const onMessage = vi.fn();

    socket.on("message:new", onMessage);
    socket.connect();
    expect(mockIoInstance.connect).toHaveBeenCalledTimes(1);
    expect(socket.isConnected()).toBe(true);

    await socket.emit("typing:start", { conversationId: 1 });
    expect(mockIoInstance.emit).toHaveBeenCalledWith("typing:start", { conversationId: 1 });

    const ack = await socket.emit("message:send", { conversationId: 1, text: "Hello" });
    expect(ack.id).toBe(999);
    expect(mockIoInstance.timeout).toHaveBeenCalledWith(10_000);

    socket.off("message:new", onMessage);
    socket.disconnect();
    expect(mockIoInstance.off).toHaveBeenCalledWith("message:new", onMessage);
    expect(mockIoInstance.disconnect).toHaveBeenCalledTimes(1);
  });

  it("MockSocket simulates message:send ack/delivery, typing, 1.5s staff auto-reply, and conversation:updated", async () => {
    vi.useFakeTimers();

    const guest = getMockUsers().find((u) => u.id === 1)!;
    setCurrentSessionUser(guest);

    const socket = new MockSocket();
    const onMessageNew = vi.fn();
    const onTyping = vi.fn();
    const onConversationUpdated = vi.fn();

    socket.on("message:new", onMessageNew);
    socket.on("typing", onTyping);
    socket.on("conversation:updated", onConversationUpdated);

    await expect(
      socket.emit("message:send", { conversationId: 1, text: "Before connect" }),
    ).rejects.toThrow("MockSocket is not connected");

    socket.connect();

    const ackMessage = await socket.emit("message:send", {
      conversationId: 1,
      text: "Can I book an early check-in?",
    });

    expect(ackMessage.conversationId).toBe(1);
    expect(ackMessage.senderRole).toBe("guest");
    expect(ackMessage.text).toBe("Can I book an early check-in?");
    expect(onMessageNew).toHaveBeenCalledTimes(1);
    expect(onMessageNew).toHaveBeenCalledWith(ackMessage);
    expect(onConversationUpdated).toHaveBeenCalledTimes(1);

    // Staff typing indicator starts before auto-reply
    vi.advanceTimersByTime(MOCK_STAFF_TYPING_DELAY_MS);
    expect(onTyping).toHaveBeenCalledWith({
      conversationId: 1,
      userId: 2,
      isTyping: true,
    });

    // At 1.5s, typing stops and staff auto-reply arrives
    vi.advanceTimersByTime(MOCK_STAFF_REPLY_DELAY_MS - MOCK_STAFF_TYPING_DELAY_MS);

    expect(onTyping).toHaveBeenLastCalledWith({
      conversationId: 1,
      userId: 2,
      isTyping: false,
    });
    expect(onMessageNew).toHaveBeenCalledTimes(2);
    const staffReply = onMessageNew.mock.calls[1]?.[0] as Message;
    expect(staffReply.senderRole).toBe("staff");
    expect(staffReply.text.toLowerCase()).toContain("check-in");

    expect(onConversationUpdated).toHaveBeenCalledTimes(2);
    const updatedAfterReply = onConversationUpdated.mock.calls[1]?.[0] as Conversation;
    expect(updatedAfterReply.unreadCount).toBe(3);

    // conversation:read clears unreadCount and notifies listeners
    await socket.emit("conversation:read", { conversationId: 1 });
    expect(onConversationUpdated).toHaveBeenCalledTimes(3);
    expect((onConversationUpdated.mock.calls[2]?.[0] as Conversation).unreadCount).toBe(0);

    socket.disconnect();
  });

  it("MockSocket answers call:offer after 2s and cancels if ended early", async () => {
    vi.useFakeTimers();

    const socket = new MockSocket();
    const onCallAnswered = vi.fn();
    const onCallEnded = vi.fn();
    socket.on("call:answered", onCallAnswered);
    socket.on("call:ended", onCallEnded);
    socket.connect();

    await socket.emit("call:offer", { conversationId: 1, sdp: { type: "offer", sdp: "mock" } });

    vi.advanceTimersByTime(MOCK_CALL_ANSWER_DELAY_MS - 1);
    expect(onCallAnswered).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onCallAnswered).toHaveBeenCalledTimes(1);
    expect(onCallAnswered).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 1,
        sdp: expect.objectContaining({ type: "answer" }),
      }),
    );

    // Cancel before 2s -> should emit call:ended and never emit call:answered again
    await socket.emit("call:offer", { conversationId: 2, sdp: { type: "offer", sdp: "mock" } });
    vi.advanceTimersByTime(500);
    await socket.emit("call:end", { conversationId: 2 });
    expect(onCallEnded).toHaveBeenCalledWith({ conversationId: 2 });

    vi.advanceTimersByTime(MOCK_CALL_ANSWER_DELAY_MS);
    expect(onCallAnswered).toHaveBeenCalledTimes(1);

    socket.disconnect();
  });

  it("updates and deduplicates messages cache and conversations cache via setQueryData helpers", () => {
    const queryClient = new QueryClient();

    const initialMessage: Message = {
      id: 10,
      conversationId: 1,
      senderId: 1,
      senderRole: "guest",
      text: "Hello",
      createdAt: "2026-11-27T09:00:00.000Z",
    };

    const incomingMessage: Message = {
      id: 11,
      conversationId: 1,
      senderId: 2,
      senderRole: "staff",
      text: "Welcome!",
      createdAt: "2026-11-27T09:01:00.000Z",
    };

    queryClient.setQueryData<MessagesListResult>(queryKeys.chat.messages(1), {
      data: [initialMessage],
      meta: { nextCursor: null },
    });

    queryClient.setQueryData(queryKeys.chat.messages(1, { limit: 30 }), {
      pages: [{ data: [initialMessage], meta: { nextCursor: null } }],
      pageParams: [undefined],
    });

    const firstInsert = upsertMessageInCache(queryClient, incomingMessage);
    expect(firstInsert.wasAlreadyPresent).toBe(false);

    const flatMessages = queryClient.getQueryData<MessagesListResult>(queryKeys.chat.messages(1));
    expect(flatMessages?.data.map((m) => m.id)).toEqual([11, 10]);

    const infiniteMessages = queryClient.getQueryData<{
      pages: MessagesListResult[];
      pageParams: unknown[];
    }>(queryKeys.chat.messages(1, { limit: 30 }));
    expect(infiniteMessages?.pages[0]?.data.map((m) => m.id)).toEqual([11, 10]);

    // Sending duplicate message id must not duplicate rows
    const duplicateInsert = upsertMessageInCache(queryClient, incomingMessage);
    expect(duplicateInsert.wasAlreadyPresent).toBe(true);
    expect(
      queryClient.getQueryData<MessagesListResult>(queryKeys.chat.messages(1))?.data,
    ).toHaveLength(2);

    // conversation:updated updates and reorders conversations cache
    const conv1: Conversation = {
      id: 1,
      guestId: 1,
      guestName: "Sara Khan",
      staffId: 2,
      status: "open",
      lastMessage: { text: "Old", createdAt: "2026-11-27T08:00:00.000Z" },
      unreadCount: 0,
    };
    const conv2: Conversation = {
      id: 2,
      guestId: 4,
      guestName: "Omar Sheikh",
      staffId: 2,
      status: "open",
      lastMessage: { text: "Hi", createdAt: "2026-11-27T08:30:00.000Z" },
      unreadCount: 0,
    };

    queryClient.setQueryData<ConversationsListResult>(queryKeys.chat.conversations(), {
      data: [conv2, conv1],
      meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });

    const updatedConv1: Conversation = {
      ...conv1,
      lastMessage: { text: "Welcome!", createdAt: "2026-11-27T09:01:00.000Z" },
      unreadCount: 1,
    };

    upsertConversationInCache(queryClient, updatedConv1);
    const updatedList = queryClient.getQueryData<ConversationsListResult>(
      queryKeys.chat.conversations(),
    );
    expect(updatedList?.data.map((c) => c.id)).toEqual([1, 2]);
    expect(updatedList?.data[0]?.unreadCount).toBe(1);
  });
});
