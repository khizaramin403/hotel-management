import { useQueryClient } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import { AppProviders } from "@/providers/AppProviders";
import { useAppDispatch, useAppSelector } from "./hooks";
import { selectAuthStatus } from "./slices/authSlice";
import { selectTotalUnreadCount, setConversationUnread } from "./slices/chatSlice";
import { selectSidebarCollapsed, toggleSidebar } from "./slices/uiSlice";

function StoreAndQueryProbe() {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const totalUnread = useAppSelector(selectTotalUnreadCount);
  const authStatus = useAppSelector(selectAuthStatus);
  const queryClient = useQueryClient();
  const queryDefaults = queryClient.getDefaultOptions().queries;

  return (
    <div>
      <span data-testid="collapsed">{String(collapsed)}</span>
      <span data-testid="unread">{totalUnread}</span>
      <span data-testid="auth-status">{authStatus}</span>
      <span data-testid="stale">{String(queryDefaults?.staleTime)}</span>
      <span data-testid="retry">{String(queryDefaults?.retry)}</span>
      <span data-testid="focus">{String(queryDefaults?.refetchOnWindowFocus)}</span>
      <button type="button" onClick={() => dispatch(toggleSidebar())}>
        Toggle
      </button>
      <button
        type="button"
        onClick={() => dispatch(setConversationUnread({ conversationId: 3, count: 5 }))}
      >
        Add unread
      </button>
    </div>
  );
}

describe("AppProviders and typed store hooks", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
    resetMockInitForTests();
    mock = new MockAdapter(apiClient);
    mock.onGet("/auth/me").reply(401, {
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Authentication required" },
    });
  });

  afterEach(() => {
    mock.restore();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("provides Redux store, narrow selectors, and QueryClient defaults in jsdom", async () => {
    render(
      <AppProviders>
        <StoreAndQueryProbe />
      </AppProviders>,
    );

    expect(screen.getByTestId("collapsed").textContent).toBe("false");
    expect(screen.getByTestId("unread").textContent).toBe("0");
    expect(screen.getByTestId("stale").textContent).toBe("30000");
    expect(screen.getByTestId("retry").textContent).toBe("1");
    expect(screen.getByTestId("focus").textContent).toBe("false");

    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe("unauthenticated");
    });

    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    fireEvent.click(screen.getByRole("button", { name: "Add unread" }));

    expect(screen.getByTestId("collapsed").textContent).toBe("true");
    expect(screen.getByTestId("unread").textContent).toBe("5");
  });
});
