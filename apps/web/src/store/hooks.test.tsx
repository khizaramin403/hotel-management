import { useQueryClient } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppProviders } from "@/providers/AppProviders";
import { useAppDispatch, useAppSelector } from "./hooks";
import { selectTotalUnreadCount, setConversationUnread } from "./slices/chatSlice";
import { selectSidebarCollapsed, toggleSidebar } from "./slices/uiSlice";

function StoreAndQueryProbe() {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const totalUnread = useAppSelector(selectTotalUnreadCount);
  const queryClient = useQueryClient();
  const queryDefaults = queryClient.getDefaultOptions().queries;

  return (
    <div>
      <span data-testid="collapsed">{String(collapsed)}</span>
      <span data-testid="unread">{totalUnread}</span>
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
  it("provides Redux store, narrow selectors, and QueryClient defaults in jsdom", () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    fireEvent.click(screen.getByRole("button", { name: "Add unread" }));

    expect(screen.getByTestId("collapsed").textContent).toBe("true");
    expect(screen.getByTestId("unread").textContent).toBe("5");
  });
});
