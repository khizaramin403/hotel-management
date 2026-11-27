import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Conversation, User } from "@hotel/shared";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockInitForTests } from "@/lib/api/client";
import * as chatEndpoint from "@/lib/api/endpoints/chat";
import { teardownMocks } from "@/mocks";
import {
  clearMockRoleCookie,
  getMockUsers,
  resetMockDb,
  setCurrentSessionUser,
  setMockRoleCookie,
} from "@/mocks/db";
import { MOCK_CALL_ANSWER_DELAY_MS, MockSocket } from "@/mocks/socket";
import { AntdProvider } from "@/providers/AntdProvider";
import { AppProviders } from "@/providers/AppProviders";
import { SocketProvider } from "@/providers/SocketProvider";
import { makeStore } from "@/store";
import { setAuthUser } from "@/store/slices/authSlice";
import {
  type CallEngine,
  MockCallEngine,
  computeElapsedCallSeconds,
  formatCallDuration,
  getCallEngine,
  resetCallEngine,
} from "../lib/callEngine";
import { clearPendingCallOffers } from "../lib/callSignaling";
import { CALL_ENDED_DISMISS_MS, CallPopup } from "./CallPopup";
import { GuestChatView } from "./GuestChatView";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithCallContext(
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
          <SocketProvider client={socket}>
            {ui}
            <CallPopup />
          </SocketProvider>
        </AntdProvider>
      </QueryClientProvider>
    </Provider>,
  );

  return { store, queryClient, socket, ...view };
}

describe("MockCallEngine and call duration helpers", () => {
  afterEach(() => {
    resetCallEngine();
  });

  it("formats MM:SS durations and handles MockCallEngine offer/answer/mute/cleanup", async () => {
    expect(formatCallDuration(0)).toBe("00:00");
    expect(formatCallDuration(134)).toBe("02:14");
    expect(
      computeElapsedCallSeconds("2026-11-27T10:00:00.000Z", Date.parse("2026-11-27T10:02:14.000Z")),
    ).toBe(134);

    const engine: CallEngine = new MockCallEngine();
    const offer = (await engine.startOffer(1)) as { type: string; sdp: string };
    expect(offer.type).toBe("offer");

    const answer = (await engine.acceptOffer(1, offer)) as { type: string; sdp: string };
    expect(answer.type).toBe("answer");

    expect(engine.isMuted()).toBe(false);
    expect(engine.setMuted(true)).toBe(true);
    expect(engine.isMuted()).toBe(true);

    engine.cleanup();
    expect(engine.isMuted()).toBe(false);
  });
});

describe("CallPopup and call state machine", () => {
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
    HTMLElement.prototype.getBoundingClientRect = function mockCallChatRect() {
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
    clearPendingCallOffers();
    resetCallEngine();
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
    clearPendingCallOffers();
    resetCallEngine();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("transitions idle -> outgoing ringing -> connected -> mute -> ended with 02:14 system pill -> idle, and ignores Escape", async () => {
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
    const emitSpy = vi.spyOn(socket, "emit");
    const { store } = renderWithCallContext(<GuestChatView />, { user: guest, socket });

    // Idle state renders no dialog
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(store.getState().call.status).toBe("idle");

    expect(
      await screen.findByText("No messages yet. Say hello.", {}, { timeout: 5000 }),
    ).toBeDefined();

    vi.useFakeTimers();

    // Clicking thread header 'Call' button starts outgoing call
    const callButton = screen.getByRole("button", { name: /call/i });
    await act(async () => {
      fireEvent.click(callButton);
      await Promise.resolve();
    });

    expect(emitSpy).toHaveBeenCalledWith(
      "call:offer",
      expect.objectContaining({ conversationId: 1 }),
    );
    expect(store.getState().call.status).toBe("ringing");
    expect(store.getState().call.direction).toBe("outgoing");

    const dialog = screen.getByRole("dialog", { name: "Audio call with Reception" });
    expect(dialog.className).toContain("sm:w-[320px]");
    expect(dialog.className).toContain("bottom-0");
    expect(screen.getByTestId("call-status-text").getAttribute("aria-live")).toBe("polite");
    expect(screen.getByTestId("call-status-text").textContent).toContain("Calling...");

    // Pressing Esc must NOT end or dismiss the call
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    expect(store.getState().call.status).toBe("ringing");
    expect(screen.getByRole("dialog")).toBeDefined();

    // After 2 seconds, MockSocket emits call:answered -> connected with timer
    await act(async () => {
      vi.advanceTimersByTime(MOCK_CALL_ANSWER_DELAY_MS);
      await Promise.resolve();
    });

    expect(store.getState().call.status).toBe("connected");
    expect(screen.getByTestId("call-status-text").textContent).toContain("Connected 00:00");

    // Advance 2m 14s (134s) -> timer updates to 02:14
    act(() => {
      vi.advanceTimersByTime(134_000);
    });
    expect(screen.getByTestId("call-status-text").textContent).toContain("Connected 02:14");

    // Mute icon toggles CallEngine & aria-pressed
    const muteBtn = screen.getByRole("button", { name: "Mute microphone" });
    fireEvent.click(muteBtn);
    expect(getCallEngine().isMuted()).toBe(true);
    expect(screen.getByRole("button", { name: "Unmute microphone" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByTestId("call-status-text").textContent).toContain("(Muted)");

    // End call emits call:end, cleans engine, transitions to ended, and appends 'Call ended 02:14' system pill
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "End call" }));
      await Promise.resolve();
    });

    expect(emitSpy).toHaveBeenCalledWith("call:end", { conversationId: 1 });
    expect(getCallEngine().isMuted()).toBe(false);
    expect(store.getState().call.status).toBe("ended");
    expect(screen.getByTestId("call-status-text").textContent).toContain("Call ended 02:14");
    expect(
      within(screen.getByTestId("chat-messages-scroll")).getByText("Call ended 02:14"),
    ).toBeDefined();

    // Auto-dismiss returns call state to idle after CALL_ENDED_DISMISS_MS
    act(() => {
      vi.advanceTimersByTime(CALL_ENDED_DISMISS_MS);
    });
    expect(store.getState().call.status).toBe("idle");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("handles incoming call ringing, Accept -> connected, and Decline -> call:reject + ended system pill", async () => {
    const staff = getMockUsers().find((u) => u.id === 2)!;
    setCurrentSessionUser(staff);

    const socket = new MockSocket();
    const emitSpy = vi.spyOn(socket, "emit");
    const acceptOfferSpy = vi.spyOn(getCallEngine(), "acceptOffer");

    const { store } = renderWithCallContext(<div />, { user: staff, socket });

    // 1. Incoming call -> Accept flow
    act(() => {
      socket.simulateServerEvent("call:incoming", {
        conversationId: 1,
        fromUserId: 1,
        sdp: { type: "offer", sdp: "mock-remote-offer" },
      });
    });

    expect(store.getState().call.status).toBe("ringing");
    expect(store.getState().call.direction).toBe("incoming");
    expect(screen.getByTestId("call-status-text").textContent).toContain("Incoming call...");
    expect(screen.getByRole("button", { name: /accept/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /decline/i })).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /accept/i }));
      await Promise.resolve();
    });

    expect(acceptOfferSpy).toHaveBeenCalledWith(1, { type: "offer", sdp: "mock-remote-offer" });
    expect(emitSpy).toHaveBeenCalledWith(
      "call:answer",
      expect.objectContaining({ conversationId: 1 }),
    );
    expect(store.getState().call.status).toBe("connected");

    // End accepted call and reset
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "End call" }));
      await Promise.resolve();
    });
    expect(store.getState().call.status).toBe("ended");

    // 2. Incoming call -> Decline flow
    act(() => {
      socket.simulateServerEvent("call:incoming", {
        conversationId: 2,
        fromUserId: 4,
        sdp: { type: "offer", sdp: "mock-offer-2" },
      });
    });

    expect(store.getState().call.status).toBe("ringing");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /decline/i }));
      await Promise.resolve();
    });

    expect(emitSpy).toHaveBeenCalledWith("call:reject", { conversationId: 2 });
    expect(store.getState().call.status).toBe("ended");
    expect(store.getState().chat.systemEventsByConversation[2]?.[0]?.text).toBe("Call ended 00:00");
  });

  it("mounts DynamicCallPopup via next/dynamic in AppProviders when a logged-in user starts a call", async () => {
    setMockRoleCookie("guest");

    render(
      <AppProviders>
        <GuestChatView />
      </AppProviders>,
    );

    // When idle, DynamicCallPopup is not mounted
    expect(screen.queryByRole("dialog")).toBeNull();

    const callButton = await screen.findByRole("button", { name: /call/i });
    await waitFor(() => {
      expect((callButton as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(callButton);

    const dialog = await screen.findByRole("dialog", { name: "Audio call with Reception" });
    expect(dialog).toBeDefined();
    expect(screen.getByTestId("call-status-text").textContent).toContain("Calling...");
  }, 15_000);
});
