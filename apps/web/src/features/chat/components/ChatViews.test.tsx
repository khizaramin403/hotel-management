import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Conversation, Message, User } from "@hotel/shared";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import * as chatEndpoint from "@/lib/api/endpoints/chat";
import { teardownMocks } from "@/mocks";
import { clearMockRoleCookie, getMockUsers, resetMockDb, setCurrentSessionUser } from "@/mocks/db";
import { MockSocket } from "@/mocks/socket";
import { AntdProvider } from "@/providers/AntdProvider";
import { SocketProvider } from "@/providers/SocketProvider";
import { makeStore } from "@/store";
import { setAuthUser } from "@/store/slices/authSlice";
import { groupChatMessages } from "../lib/chatFormat";
import {
  ChatInputBar,
  TYPING_START_DEBOUNCE_MS,
  TYPING_STOP_DEBOUNCE_MS,
} from "./ChatInputBar";
import { ChatMessage } from "./ChatMessage";
import { GuestChatView } from "./GuestChatView";
import { StaffChatView } from "./StaffChatView";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderWithChatProviders(
  ui: React.ReactElement,
  {
    user,
    socket = new MockSocket(),
    queryClient = createTestQueryClient(),
  }: {
    user: User;
    socket?: MockSocket;
    queryClient?: QueryClient;
  },
) {
  const store = makeStore();
  store.dispatch(setAuthUser(user));

  const view = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AntdProvider>
          <SocketProvider client={socket}>{ui}</SocketProvider>
        </AntdProvider>
      </QueryClientProvider>
    </Provider>,
  );

  return { store, queryClient, socket, ...view };
}

describe("Chat grouping, ChatMessage memo, and ChatInputBar", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("groups messages within 2 minutes, places timestamps at group ends, inserts date pills, and memoizes ChatMessage", () => {
    expect((ChatMessage as unknown as { $$typeof?: symbol }).$$typeof).toBe(
      Symbol.for("react.memo"),
    );

    const now = new Date(2026, 10, 27, 14, 0, 0);
    const yesterday = new Date(2026, 10, 26, 18, 10, 0);
    const todayOne = new Date(2026, 10, 27, 10, 0, 0);
    const todayTwoSameMin = new Date(2026, 10, 27, 10, 1, 20);
    const todayThreeLater = new Date(2026, 10, 27, 10, 5, 0);
    const todayStaffReply = new Date(2026, 10, 27, 10, 5, 30);

    const messages: Message[] = [
      {
        id: 1,
        conversationId: 1,
        senderId: 2,
        senderRole: "staff",
        text: "Welcome yesterday!",
        createdAt: yesterday.toISOString(),
      },
      {
        id: 2,
        conversationId: 1,
        senderId: 1,
        senderRole: "guest",
        text: "First today message",
        createdAt: todayOne.toISOString(),
      },
      {
        id: 3,
        conversationId: 1,
        senderId: 1,
        senderRole: "guest",
        text: "Second within two minutes",
        createdAt: todayTwoSameMin.toISOString(),
      },
      {
        id: 4,
        conversationId: 1,
        senderId: 1,
        senderRole: "guest",
        text: "Third after 2+ minute gap",
        createdAt: todayThreeLater.toISOString(),
      },
      {
        id: 5,
        conversationId: 1,
        senderId: 2,
        senderRole: "staff",
        text: "Staff reply",
        createdAt: todayStaffReply.toISOString(),
      },
    ];

    const grouped = groupChatMessages(messages, now);

    expect(grouped[0]?.showDatePill).toBe(true);
    expect(grouped[0]?.datePillLabel).toBe("Yesterday");
    expect(grouped[0]?.showTimestamp).toBe(true);

    // Msg 2 & Msg 3 grouped together (same sender within 2 min) -> timestamp only on Msg 3
    expect(grouped[1]?.showDatePill).toBe(true);
    expect(grouped[1]?.datePillLabel).toBe("Today");
    expect(grouped[1]?.isGroupedWithPrevious).toBe(false);
    expect(grouped[1]?.showTimestamp).toBe(false);

    expect(grouped[2]?.showDatePill).toBe(false);
    expect(grouped[2]?.isGroupedWithPrevious).toBe(true);
    expect(grouped[2]?.showTimestamp).toBe(true);

    // Msg 4 has > 2 minute gap -> new group
    expect(grouped[3]?.isGroupedWithPrevious).toBe(false);
    expect(grouped[3]?.showTimestamp).toBe(true);

    // Msg 5 is staff -> new group
    expect(grouped[4]?.isGroupedWithPrevious).toBe(false);
    expect(grouped[4]?.showTimestamp).toBe(true);

    render(
      <AntdProvider>
        <div>
          {grouped.map((item) => (
            <ChatMessage
              key={item.message.id}
              messageId={item.message.id}
              text={item.message.text}
              createdAt={item.message.createdAt}
              isOwn={item.message.senderId === 1}
              senderLabel={item.message.senderId === 1 ? "You" : "Reception"}
              datePillLabel={item.showDatePill ? item.datePillLabel : undefined}
              isGroupedWithPrevious={item.isGroupedWithPrevious}
              showTimestamp={item.showTimestamp}
            />
          ))}
        </div>
      </AntdProvider>,
    );

    expect(screen.getByText("Yesterday")).toBeDefined();
    expect(screen.getByText("Today")).toBeDefined();
    expect(screen.getByText("First today message").className).toContain("bg-green-600");
    expect(screen.getByText("Staff reply").className).toContain("bg-neutral-0");
  });

  it("handles Enter vs Shift+Enter and debounces typing:start and typing:stop", () => {
    vi.useFakeTimers();

    const onSend = vi.fn();
    const onTypingStart = vi.fn();
    const onTypingStop = vi.fn();

    render(
      <AntdProvider>
        <ChatInputBar
          conversationId={1}
          onSendMessage={onSend}
          onTypingStart={onTypingStart}
          onTypingStop={onTypingStop}
        />
      </AntdProvider>,
    );

    const textarea = screen.getByLabelText("Message input") as HTMLTextAreaElement;

    // Blank Enter does not submit
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onSend).not.toHaveBeenCalled();

    // Rapid typing emits typing:start only once after debounce
    fireEvent.change(textarea, { target: { value: "H" } });
    fireEvent.change(textarea, { target: { value: "Hello" } });
    expect(onTypingStart).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(TYPING_START_DEBOUNCE_MS);
    });
    expect(onTypingStart).toHaveBeenCalledTimes(1);
    expect(onTypingStart).toHaveBeenCalledWith(1);

    // Shift+Enter does NOT send
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();

    // Idle stops typing after debounce
    act(() => {
      vi.advanceTimersByTime(TYPING_STOP_DEBOUNCE_MS);
    });
    expect(onTypingStop).toHaveBeenCalledWith(1);

    // Plain Enter sends trimmed text, clears textarea, and calls onSendMessage
    fireEvent.change(textarea, { target: { value: "  Line 1\nLine 2  " } });
    act(() => {
      vi.advanceTimersByTime(TYPING_START_DEBOUNCE_MS);
    });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("Line 1\nLine 2");
    expect(textarea.value).toBe("");
    expect(onTypingStop).toHaveBeenLastCalledWith(1);
  });
});

describe("GuestChatView and StaffChatView", () => {
  let originalGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect;
  let originalClientHeight: PropertyDescriptor | undefined;
  let originalClientWidth: PropertyDescriptor | undefined;
  let originalScrollHeight: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");
    originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
    originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");

    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get(this: HTMLElement) {
        if (this.getAttribute?.("data-testid") === "chat-messages-scroll") {
          return 480;
        }
        return originalClientHeight?.get ? (originalClientHeight.get.call(this) as number) : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get(this: HTMLElement) {
        if (this.getAttribute?.("data-testid") === "chat-messages-scroll") {
          return 640;
        }
        return originalClientWidth?.get ? (originalClientWidth.get.call(this) as number) : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get(this: HTMLElement) {
        if (this.getAttribute?.("data-testid") === "chat-messages-scroll") {
          const inner = this.querySelector<HTMLElement>(":scope > div");
          const parsed = inner ? Number.parseInt(inner.style.height || "0", 10) : 0;
          return Math.max(480, Number.isFinite(parsed) ? parsed : 480);
        }
        return originalScrollHeight?.get ? (originalScrollHeight.get.call(this) as number) : 0;
      },
    });

    HTMLElement.prototype.getBoundingClientRect = function mockChatRect() {
      if (this.getAttribute?.("data-testid") === "chat-messages-scroll") {
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: 640,
          bottom: 480,
          width: 640,
          height: 480,
          toJSON: () => ({}),
        } as DOMRect;
      }
      if (this.getAttribute?.("data-index") !== null) {
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: 600,
          bottom: 84,
          width: 600,
          height: 84,
          toJSON: () => ({}),
        } as DOMRect;
      }
      return originalGetBoundingClientRect.call(this);
    };

    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth,chat");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    if (originalClientHeight) {
      Object.defineProperty(HTMLElement.prototype, "clientHeight", originalClientHeight);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "clientHeight");
    }
    if (originalClientWidth) {
      Object.defineProperty(HTMLElement.prototype, "clientWidth", originalClientWidth);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
    }
    if (originalScrollHeight) {
      Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalScrollHeight);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollHeight");
    }
    vi.useRealTimers();
    clearMockRoleCookie();
    vi.restoreAllMocks();
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("supports optimistic send with sending state, confirmed delivery, and failed state with Retry", async () => {
    const guest = getMockUsers().find((u) => u.id === 1)!;
    setCurrentSessionUser(guest);

    const conversation: Conversation = {
      id: 1,
      guestId: 1,
      guestName: "Sara Khan",
      staffId: 2,
      status: "open",
      lastMessage: null,
      unreadCount: 0,
    };

    vi.spyOn(chatEndpoint, "createConversation").mockResolvedValue(conversation);
    vi.spyOn(chatEndpoint, "listConversationMessages").mockResolvedValue({
      data: [],
      meta: { nextCursor: null },
    });

    const socket = new MockSocket();
    const firstEmit = createDeferred<Message>();
    const retryEmit = createDeferred<Message>();
    let sendCallCount = 0;

    const baseEmit = socket.emit.bind(socket);
    vi.spyOn(socket, "emit").mockImplementation((event, payload) => {
      if (event === "message:send") {
        sendCallCount += 1;
        return (sendCallCount === 1 ? firstEmit.promise : retryEmit.promise) as never;
      }
      return baseEmit(event, payload);
    });

    renderWithChatProviders(<GuestChatView />, { user: guest, socket });

    // Empty state shown initially
    await waitFor(() => {
      expect(screen.getByText("No messages yet. Say hello.")).toBeDefined();
    });

    const input = screen.getByLabelText("Message input");
    fireEvent.change(input, { target: { value: "Need late check-out please" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    // Optimistic message immediately shows Sending...
    await waitFor(() => {
      expect(screen.getByText("Need late check-out please")).toBeDefined();
      expect(screen.getByText("Sending...")).toBeDefined();
    });

    // Simulate delivery failure -> shows Failed to send + Retry
    await act(async () => {
      firstEmit.reject(new Error("Network offline"));
    });

    await waitFor(() => {
      expect(screen.getByText("Failed to send")).toBeDefined();
      expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
    });

    // Click Retry -> goes back to Sending..., then resolves to confirmed message
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByText("Sending...")).toBeDefined();

    const confirmed: Message = {
      id: 900,
      conversationId: 1,
      senderId: guest.id,
      senderRole: "guest",
      text: "Need late check-out please",
      createdAt: "2026-11-27T12:00:00.000Z",
    };

    await act(async () => {
      socket.simulateServerEvent("message:new", confirmed);
      retryEmit.resolve(confirmed);
    });

    await waitFor(() => {
      expect(screen.queryByText("Sending...")).toBeNull();
      expect(screen.queryByText("Failed to send")).toBeNull();
    });
    // Must not duplicate confirmed message
    expect(screen.getAllByText("Need late check-out please")).toHaveLength(1);
  });

  it("loads virtualized 150-message guest thread, sends conversation:read, shows New messages when scrolled up, and loads older cursor page", async () => {
    const guest = getMockUsers().find((u) => u.id === 1)!;
    setCurrentSessionUser(guest);

    const socket = new MockSocket();
    const emitSpy = vi.spyOn(socket, "emit");
    const listMsgsSpy = vi.spyOn(chatEndpoint, "listConversationMessages");

    renderWithChatProviders(<GuestChatView />, { user: guest, socket });

    // Header: Reception, Online dot, Call secondary button
    await waitFor(() => {
      expect(screen.getByText("Reception")).toBeDefined();
      expect(screen.getByText("Online")).toBeDefined();
      expect(screen.getByRole("button", { name: /call/i })).toBeDefined();
    });

    expect(emitSpy).toHaveBeenCalledWith("conversation:read", { conversationId: 1 });

    // Initial page of 30 messages loaded and virtualizer renders latest rows without rendering all 150
    await waitFor(() => {
      expect(
        screen.getByText("Also could you share the breakfast timings again?"),
      ).toBeDefined();
    });
    const renderedMsgNodes = document.querySelectorAll("[data-message-id]");
    expect(renderedMsgNodes.length).toBeGreaterThan(0);
    expect(renderedMsgNodes.length).toBeLessThan(30);

    // Simulate scrolled up away from bottom -> incoming message shows 'New messages' pill
    const scrollEl = screen.getByTestId("chat-messages-scroll");
    Object.defineProperty(scrollEl, "scrollHeight", { value: 2400, configurable: true });
    Object.defineProperty(scrollEl, "clientHeight", { value: 480, configurable: true });
    Object.defineProperty(scrollEl, "scrollTop", {
      value: 200,
      writable: true,
      configurable: true,
    });
    fireEvent.scroll(scrollEl);

    act(() => {
      socket.simulateServerEvent("message:new", {
        id: 200,
        conversationId: 1,
        senderId: 2,
        senderRole: "staff",
        text: "Breakfast is served 7:00 AM to 10:30 AM.",
        createdAt: new Date().toISOString(),
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /new messages/i })).toBeDefined();
    });

    // Clicking 'New messages' clears the pill
    fireEvent.click(screen.getByRole("button", { name: /new messages/i }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /new messages/i })).toBeNull();
    });

    // Reaching top loads older page via cursor
    scrollEl.scrollTop = 0;
    fireEvent.scroll(scrollEl);

    await waitFor(() => {
      expect(listMsgsSpy).toHaveBeenCalledWith(1, { limit: 30, cursor: 121 });
    });
  });

  it("renders StaffChatView 320px list + responsive mobile classes, unread badges, and clears unread with conversation:read on open", async () => {
    const staff = getMockUsers().find((u) => u.id === 2)!;
    setCurrentSessionUser(staff);

    const socket = new MockSocket();
    const emitSpy = vi.spyOn(socket, "emit");

    const { store } = renderWithChatProviders(<StaffChatView />, { user: staff, socket });

    // List renders 3 seeded conversations with unread badges (2, 1) and desktop 320px split layout
    const listPane = screen.getByTestId("conversation-list-pane");
    const threadPane = screen.getByTestId("chat-thread-pane");
    expect(listPane.className).toContain("md:w-[320px]");
    expect(listPane.className).toContain("block w-full");
    expect(threadPane.className).toContain("hidden md:flex");

    await waitFor(() => {
      expect(within(listPane).getByText("Sara Khan")).toBeDefined();
      expect(within(listPane).getByText("Omar Sheikh")).toBeDefined();
      expect(within(listPane).getByText("Zara Ahmed")).toBeDefined();
      expect(within(listPane).getByLabelText("2 unread messages")).toBeDefined();
      expect(within(listPane).getByLabelText("1 unread messages")).toBeDefined();
    });

    // Open Sara Khan's conversation -> clears unread count and sends conversation:read
    fireEvent.click(within(listPane).getByText("Sara Khan"));

    await waitFor(() => {
      expect(listPane.className).toContain("hidden md:block");
      expect(threadPane.className).toContain("flex w-full");
      expect(within(threadPane).getByText("Sara Khan")).toBeDefined();
      expect(emitSpy).toHaveBeenCalledWith("conversation:read", { conversationId: 1 });
    });

    expect(store.getState().chat.unreadByConversation[1]).toBe(0);
    expect(within(listPane).queryByLabelText("2 unread messages")).toBeNull();

    // Mobile Back button returns to conversation list view
    const backBtn = screen.getByRole("button", { name: "Back to conversations" });
    fireEvent.click(backBtn);
    expect(listPane.className).toContain("block w-full");
    expect(threadPane.className).toContain("hidden md:flex");
  });

  it("shows loading skeleton and error Alert with Try again on chat load failure", async () => {
    const guest = getMockUsers().find((u) => u.id === 1)!;
    setCurrentSessionUser(guest);

    const deferred = createDeferred<Conversation>();
    const createSpy = vi
      .spyOn(chatEndpoint, "createConversation")
      .mockReturnValueOnce(deferred.promise);

    renderWithChatProviders(<GuestChatView />, { user: guest });

    expect(screen.getByRole("status", { name: "Loading reception chat" })).toBeDefined();

    await act(async () => {
      deferred.reject(
        new ApiClientError({
          status: 500,
          code: "INTERNAL_ERROR",
          message: "Server error",
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Could not open chat")).toBeDefined();
    });

    createSpy.mockResolvedValueOnce({
      id: 1,
      guestId: 1,
      guestName: "Sara Khan",
      staffId: 2,
      status: "open",
      lastMessage: null,
      unreadCount: 0,
    });
    vi.spyOn(chatEndpoint, "listConversationMessages").mockResolvedValueOnce({
      data: [],
      meta: { nextCursor: null },
    });

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(screen.getByText("No messages yet. Say hello.")).toBeDefined();
    });
  });
});
