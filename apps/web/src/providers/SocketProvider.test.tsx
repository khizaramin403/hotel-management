import { useEffect, useState } from "react";
import type { Conversation, Message } from "@hotel/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys, type ConversationsListResult, type MessagesListResult } from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import { teardownMocks } from "@/mocks";
import { clearMockRoleCookie, getMockUsers, resetMockDb, setCurrentSessionUser, setMockRoleCookie } from "@/mocks/db";
import { MOCK_STAFF_REPLY_DELAY_MS, MockSocket } from "@/mocks/socket";
import { makeStore } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuth, setAuthUser } from "@/store/slices/authSlice";
import {
  selectTotalUnreadCount,
  selectTypingByConversation,
  selectUnreadByConversation,
  setActiveConversation,
} from "@/store/slices/chatSlice";
import { AppProviders } from "./AppProviders";
import { SocketProvider, useSocket } from "./SocketProvider";

function SocketStateProbe() {
  const socket = useSocket();
  const dispatch = useAppDispatch();
  const unreadByConversation = useAppSelector(selectUnreadByConversation);
  const totalUnread = useAppSelector(selectTotalUnreadCount);
  const typingByConversation = useAppSelector(selectTypingByConversation);
  const [connectedSocket, setConnectedSocket] = useState<typeof socket>(null);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleConnect = () => setConnectedSocket(socket);
    const handleDisconnect = () => setConnectedSocket(null);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket]);

  const isConnected = socket !== null && (connectedSocket === socket || socket.isConnected());

  return (
    <div>
      <span data-testid="has-socket">{socket ? "yes" : "no"}</span>
      <span data-testid="socket-connected">{isConnected ? "yes" : "no"}</span>
      <span data-testid="total-unread">{totalUnread}</span>
      <span data-testid="unread-1">{unreadByConversation[1] ?? 0}</span>
      <span data-testid="typing-1">{String(Boolean(typingByConversation[1]))}</span>
      <button type="button" onClick={() => dispatch(setActiveConversation(1))}>
        Activate 1
      </button>
      <button type="button" onClick={() => dispatch(clearAuth())}>
        Force logout
      </button>
    </div>
  );
}

describe("SocketProvider and event wiring", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth,chat");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearMockRoleCookie();
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("mounts SocketProvider inside AppProviders only for logged-in users and disconnects on logout", async () => {
    // 1. Logged out -> SocketProvider must NOT be mounted
    const loggedOut = render(
      <AppProviders>
        <SocketStateProbe />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("has-socket").textContent).toBe("no");
    });
    loggedOut.unmount();

    // 2. Logged in -> SocketProvider mounts and connects
    setMockRoleCookie("guest");
    render(
      <AppProviders>
        <SocketStateProbe />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("has-socket").textContent).toBe("yes");
      expect(screen.getByTestId("socket-connected").textContent).toBe("yes");
    });

    // 3. Transitioning auth back to unauthenticated unmounts SocketProvider automatically
    act(() => {
      screen.getByRole("button", { name: "Force logout" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("has-socket").textContent).toBe("no");
    });
  });

  it("unmounts and disconnects when auth transitions to unauthenticated", () => {
    const store = makeStore();
    store.dispatch(
      setAuthUser({
        id: 1,
        name: "Sara Khan",
        email: "guest@example.com",
        role: "guest",
      }),
    );
    const queryClient = new QueryClient();
    const mockSocket = new MockSocket();
    const disconnectSpy = vi.spyOn(mockSocket, "disconnect");

    const { rerender } = render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <SocketProvider client={mockSocket}>
            <SocketStateProbe />
          </SocketProvider>
        </QueryClientProvider>
      </Provider>,
    );

    expect(screen.getByTestId("has-socket").textContent).toBe("yes");
    expect(mockSocket.isConnected()).toBe(true);

    act(() => {
      store.dispatch(clearAuth());
    });

    rerender(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <SocketStateProbe />
        </QueryClientProvider>
      </Provider>,
    );

    expect(screen.getByTestId("has-socket").textContent).toBe("no");
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it("wires message:new (deduplicated setQueryData + unread), typing, and conversation:updated", async () => {
    vi.useFakeTimers();

    const guest = getMockUsers().find((u) => u.id === 1)!;
    setCurrentSessionUser(guest);

    const store = makeStore();
    store.dispatch(
      setAuthUser({
        id: guest.id,
        name: guest.name,
        email: guest.email,
        role: "guest",
      }),
    );

    const queryClient = new QueryClient();
    const initialMsg: Message = {
      id: 150,
      conversationId: 1,
      senderId: 2,
      senderRole: "staff",
      text: "How can we help?",
      createdAt: "2026-11-27T08:00:00.000Z",
    };
    const initialConv: Conversation = {
      id: 1,
      guestId: 1,
      guestName: "Sara Khan",
      staffId: 2,
      status: "open",
      lastMessage: { text: initialMsg.text, createdAt: initialMsg.createdAt },
      unreadCount: 0,
    };

    queryClient.setQueryData<MessagesListResult>(queryKeys.chat.messages(1), {
      data: [initialMsg],
      meta: { nextCursor: null },
    });
    queryClient.setQueryData<ConversationsListResult>(queryKeys.chat.conversations(), {
      data: [initialConv],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const mockSocket = new MockSocket();

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <SocketProvider client={mockSocket}>
            <SocketStateProbe />
          </SocketProvider>
        </QueryClientProvider>
      </Provider>,
    );

    // 1. Incoming remote message when conversation 1 is not active increments unread and updates messages cache
    const incomingStaffMsg: Message = {
      id: 500,
      conversationId: 1,
      senderId: 2,
      senderRole: "staff",
      text: "Your room is ready.",
      createdAt: "2026-11-27T08:05:00.000Z",
    };

    act(() => {
      mockSocket.simulateServerEvent("message:new", incomingStaffMsg);
      // Duplicate delivery with same id must neither duplicate message nor double-increment unread
      mockSocket.simulateServerEvent("message:new", incomingStaffMsg);
    });

    expect(screen.getByTestId("unread-1").textContent).toBe("1");
    expect(screen.getByTestId("total-unread").textContent).toBe("1");

    const cachedMsgs = queryClient.getQueryData<MessagesListResult>(queryKeys.chat.messages(1));
    expect(cachedMsgs?.data.map((m) => m.id)).toEqual([500, 150]);

    // 2. Typing from remote user updates typingByConversation; own typing echo is ignored
    act(() => {
      mockSocket.simulateServerEvent("typing", {
        conversationId: 1,
        userId: 2,
        isTyping: true,
      });
    });
    expect(screen.getByTestId("typing-1").textContent).toBe("true");

    act(() => {
      mockSocket.simulateServerEvent("typing", {
        conversationId: 1,
        userId: 1,
        isTyping: false,
      });
    });
    expect(screen.getByTestId("typing-1").textContent).toBe("true");

    act(() => {
      mockSocket.simulateServerEvent("typing", {
        conversationId: 1,
        userId: 2,
        isTyping: false,
      });
    });
    expect(screen.getByTestId("typing-1").textContent).toBe("false");

    // 3. conversation:updated updates cached conversations list via setQueryData
    const updatedConv: Conversation = {
      ...initialConv,
      lastMessage: { text: incomingStaffMsg.text, createdAt: incomingStaffMsg.createdAt },
      unreadCount: 1,
    };
    act(() => {
      mockSocket.simulateServerEvent("conversation:updated", updatedConv);
    });

    const cachedConvs = queryClient.getQueryData<ConversationsListResult>(
      queryKeys.chat.conversations(),
    );
    expect(cachedConvs?.data[0]?.lastMessage?.text).toBe("Your room is ready.");

    // 4. Sending message as guest while active conversation is 1 avoids incrementing unread on reply
    act(() => {
      screen.getByRole("button", { name: "Activate 1" }).click();
    });
    expect(screen.getByTestId("unread-1").textContent).toBe("0");

    await act(async () => {
      await mockSocket.emit("message:send", {
        conversationId: 1,
        text: "Thanks!",
      });
    });

    act(() => {
      vi.advanceTimersByTime(MOCK_STAFF_REPLY_DELAY_MS);
    });

    // Staff reply added to cache while unread stays 0 for active conversation 1
    const finalMsgs = queryClient.getQueryData<MessagesListResult>(queryKeys.chat.messages(1));
    expect(finalMsgs?.data.length).toBe(4);
    expect(screen.getByTestId("unread-1").textContent).toBe("0");
  });
});
