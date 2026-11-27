import type { Booking, Conversation, Message } from "@hotel/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys, type BookingsListResult, type ConversationsListResult } from "@/lib/api";
import { MockSocket } from "@/mocks/socket";
import { AntdProvider } from "@/providers/AntdProvider";
import { SocketProvider } from "@/providers/SocketProvider";
import { makeStore } from "@/store";
import { setAuthUser } from "@/store/slices/authSlice";
import { setActiveConversation } from "@/store/slices/chatSlice";
import {
  addNotification,
  MAX_NOTIFICATIONS,
  selectNotifications,
  selectUnreadNotificationCount,
} from "@/store/slices/notificationsSlice";
import { NotificationBell } from "./NotificationBell";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 1050,
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
    status: "pending",
    expiresAt: "2026-11-27T19:00:00.000Z",
    createdAt: "2026-11-27T18:30:00.000Z",
    payment: null,
    ...overrides,
  };
}

function renderBellWithProviders({
  role = "guest",
  userId = 1,
  name = "Sara Khan",
  store = makeStore(),
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
  mockSocket = new MockSocket(),
}: {
  role?: "guest" | "staff" | "admin";
  userId?: number;
  name?: string;
  store?: ReturnType<typeof makeStore>;
  queryClient?: QueryClient;
  mockSocket?: MockSocket;
} = {}) {
  store.dispatch(
    setAuthUser({
      id: userId,
      name,
      email: `${role}@example.com`,
      role,
    }),
  );

  const view = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AntdProvider>
          <SocketProvider client={mockSocket}>
            <NotificationBell />
          </SocketProvider>
        </AntdProvider>
      </QueryClientProvider>
    </Provider>,
  );

  return { store, queryClient, mockSocket, ...view };
}

describe("NotificationBell", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows 'No notifications' when empty and supports keyboard open and Escape close with focus return", async () => {
    renderBellWithProviders();

    const trigger = screen.getByRole("button", { name: "Notifications" });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    const region = await screen.findByRole("region", { name: "Notifications" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(within(region).getByText("No notifications")).toBeDefined();
    expect(
      (within(region).getByRole("button", { name: "Mark all read" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    fireEvent.keyDown(region, { key: "Escape" });

    await waitFor(() => {
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(trigger);
      const dropdownWrapper = document.querySelector(".ant-dropdown");
      const isHiddenOrClosed =
        dropdownWrapper === null ||
        dropdownWrapper.className.includes("ant-dropdown-hidden") ||
        dropdownWrapper.className.includes("ant-slide-up-leave");
      expect(isHiddenOrClosed).toBe(true);
    });
  });

  it("supports Arrow key focus navigation and item activation across notifications", async () => {
    const { store } = renderBellWithProviders();

    act(() => {
      store.dispatch(
        addNotification({
          id: "chat-1",
          type: "chat_message",
          text: "Reception: Early check-in is available.",
          createdAt: "2026-11-27T18:10:00.000Z",
        }),
      );
      store.dispatch(
        addNotification({
          id: "bk-1",
          type: "booking_confirmed",
          text: "Booking BK-1050 confirmed (Deluxe 201).",
          createdAt: "2026-11-27T18:15:00.000Z",
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Notifications (2 unread)" }));
    const openRegion = await screen.findByRole("region", { name: "Notifications" });
    const markAllButton = within(openRegion).getByRole("button", { name: "Mark all read" });
    const firstItemBtn = within(openRegion)
      .getByText("Booking BK-1050 confirmed (Deluxe 201).")
      .closest("button")!;
    const secondItemBtn = within(openRegion)
      .getByText("Reception: Early check-in is available.")
      .closest("button")!;

    await waitFor(() => {
      expect(document.activeElement).toBe(markAllButton);
    });

    fireEvent.keyDown(openRegion, { key: "ArrowDown" });
    expect(document.activeElement).toBe(firstItemBtn);

    fireEvent.keyDown(openRegion, { key: "ArrowDown" });
    expect(document.activeElement).toBe(secondItemBtn);

    fireEvent.keyDown(openRegion, { key: "ArrowUp" });
    expect(document.activeElement).toBe(firstItemBtn);

    fireEvent.click(firstItemBtn);
    expect(selectUnreadNotificationCount(store.getState())).toBe(1);
    expect(mockPush).toHaveBeenCalledWith("/my-bookings");
  });

  it("feeds from socket message:new, shows top-right Ant Design toast only when not on that thread, and caps list at 10", async () => {
    const { store, mockSocket, queryClient } = renderBellWithProviders({
      role: "staff",
      userId: 2,
      name: "Bilal Ahmed",
    });

    const conv: Conversation = {
      id: 7,
      guestId: 1,
      guestName: "Sara Khan",
      staffId: 2,
      status: "open",
      lastMessage: null,
      unreadCount: 0,
    };
    queryClient.setQueryData<ConversationsListResult>(queryKeys.chat.conversations(), {
      data: [conv],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    // 1. Incoming guest message while staff is NOT on thread 7 -> adds bell item + shows topRight notification toast
    const awayMsg: Message = {
      id: 901,
      conversationId: 7,
      senderId: 1,
      senderRole: "guest",
      text: "Hello, can we request airport pickup?",
      createdAt: "2026-11-27T18:20:00.000Z",
    };

    act(() => {
      mockSocket.simulateServerEvent("message:new", awayMsg);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Notifications (1 unread)" })).toBeDefined();
      expect(document.querySelector(".ant-notification-topRight")).not.toBeNull();
      expect(screen.getByText("New message from Sara Khan")).toBeDefined();
      expect(screen.getByText("Hello, can we request airport pickup?")).toBeDefined();
    });

    // 2. User opens thread 7 -> message on active thread must NOT fire notification toast or add bell item
    act(() => {
      store.dispatch(setActiveConversation(7));
    });

    const activeThreadMsg: Message = {
      id: 902,
      conversationId: 7,
      senderId: 1,
      senderRole: "guest",
      text: "Flight lands at 9 PM.",
      createdAt: "2026-11-27T18:21:00.000Z",
    };

    act(() => {
      mockSocket.simulateServerEvent("message:new", activeThreadMsg);
    });

    expect(selectNotifications(store.getState())).toHaveLength(1);
    expect(screen.queryByText("Flight lands at 9 PM.")).toBeNull();

    // 3. Feed 11 more messages while on another page (activeConversationId = null) -> max 10 newest first
    act(() => {
      store.dispatch(setActiveConversation(null));
      for (let i = 1; i <= 11; i += 1) {
        mockSocket.simulateServerEvent("message:new", {
          id: 910 + i,
          conversationId: 7,
          senderId: 1,
          senderRole: "guest",
          text: `Follow-up note ${i}`,
          createdAt: `2026-11-27T18:${String(21 + i).padStart(2, "0")}:00.000Z`,
        });
      }
    });

    const notifications = selectNotifications(store.getState());
    expect(notifications).toHaveLength(MAX_NOTIFICATIONS);
    expect(notifications[0]?.text).toBe("Sara Khan: Follow-up note 11");
    expect(screen.getByRole("button", { name: "Notifications (10 unread)" })).toBeDefined();
  });

  it("feeds from booking query updates (guest confirmed/cancelled; staff/admin new booking) and marks all read", async () => {
    // 1. Guest: pending -> confirmed and confirmed -> cancelled via query cache updates
    const guestRender = renderBellWithProviders({
      role: "guest",
      userId: 1,
      name: "Sara Khan",
    });

    const pendingBooking = makeBooking({ id: 1060, status: "pending" });
    act(() => {
      guestRender.queryClient.setQueryData(
        queryKeys.bookings.detail(1060),
        pendingBooking,
      );
    });
    expect(selectNotifications(guestRender.store.getState())).toEqual([]);

    act(() => {
      guestRender.queryClient.setQueryData(queryKeys.bookings.detail(1060), {
        ...pendingBooking,
        status: "confirmed",
      });
    });

    await waitFor(() => {
      expect(selectUnreadNotificationCount(guestRender.store.getState())).toBe(1);
    });

    act(() => {
      guestRender.queryClient.setQueryData(queryKeys.bookings.my({ page: 1, limit: 10 }), {
        data: [{ ...pendingBooking, status: "cancelled" }],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      } satisfies BookingsListResult);
    });

    await waitFor(() => {
      expect(selectUnreadNotificationCount(guestRender.store.getState())).toBe(2);
    });

    fireEvent.click(screen.getByRole("button", { name: "Notifications (2 unread)" }));
    const guestDropdown = await screen.findByRole("region", { name: "Notifications" });
    expect(within(guestDropdown).getByText("Booking BK-1060 confirmed (Deluxe 201).")).toBeDefined();
    expect(within(guestDropdown).getByText("Booking BK-1060 cancelled (Deluxe 201).")).toBeDefined();

    // Mark all read clears badge and marks items read
    fireEvent.click(within(guestDropdown).getByRole("button", { name: "Mark all read" }));
    expect(selectUnreadNotificationCount(guestRender.store.getState())).toBe(0);
    expect(screen.getByRole("button", { name: "Notifications" })).toBeDefined();

    guestRender.unmount();

    // 2. Staff: new booking added to bookings.list after initial baseline
    const staffRender = renderBellWithProviders({
      role: "staff",
      userId: 2,
      name: "Bilal Ahmed",
    });

    const existingBooking = makeBooking({ id: 1061, status: "confirmed" });
    act(() => {
      staffRender.queryClient.setQueryData<BookingsListResult>(
        queryKeys.bookings.list({ page: 1, limit: 10 }),
        {
          data: [existingBooking],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      );
    });

    // Baseline should not produce notifications
    expect(selectNotifications(staffRender.store.getState())).toEqual([]);

    const newlyCreatedBooking = makeBooking({
      id: 1062,
      guestName: "Ali Raza",
      roomNumber: "301",
      roomType: "Suite",
      status: "pending",
    });

    act(() => {
      staffRender.queryClient.setQueryData<BookingsListResult>(
        queryKeys.bookings.list({ page: 1, limit: 10 }),
        {
          data: [newlyCreatedBooking, existingBooking],
          meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
        },
      );
    });

    await waitFor(() => {
      expect(selectUnreadNotificationCount(staffRender.store.getState())).toBe(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "Notifications (1 unread)" }));
    const staffDropdown = await screen.findByRole("region", { name: "Notifications" });
    expect(
      within(staffDropdown).getByText("New booking BK-1062 from Ali Raza (Suite 301)."),
    ).toBeDefined();

    // Clicking the staff notification marks it read and navigates to /dashboard/bookings
    fireEvent.click(within(staffDropdown).getByText("New booking BK-1062 from Ali Raza (Suite 301)."));
    expect(selectUnreadNotificationCount(staffRender.store.getState())).toBe(0);
    expect(mockPush).toHaveBeenCalledWith("/dashboard/bookings");
  });
});
