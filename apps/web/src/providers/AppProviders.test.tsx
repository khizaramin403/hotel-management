import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockInitForTests } from "@/lib/api/client";
import { resetMockDb, setMockRoleCookie } from "@/mocks/db";
import { teardownMocks } from "@/mocks";
import { AppProviders } from "@/providers/AppProviders";
import { BOOKING_DRAFT_STORAGE_KEY } from "@/store/bookingDraftStorage";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthStatus, selectAuthUser } from "@/store/slices/authSlice";
import {
  selectBookingRoomId,
  selectBookingStep,
  setBookingDates,
  setBookingRoom,
  setBookingStep,
} from "@/store/slices/bookingDraftSlice";

function AuthBootstrapProbe() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);
  const user = useAppSelector(selectAuthUser);
  const bookingRoomId = useAppSelector(selectBookingRoomId);
  const bookingStep = useAppSelector(selectBookingStep);

  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="email">{user?.email ?? "none"}</span>
      <span data-testid="role">{user?.role ?? "none"}</span>
      <span data-testid="draft-room">{bookingRoomId ?? "none"}</span>
      <span data-testid="draft-step">{bookingStep}</span>
      <button
        type="button"
        onClick={() => {
          dispatch(setBookingRoom(5));
          dispatch(setBookingDates({ checkIn: "2026-12-20", checkOut: "2026-12-23" }));
          dispatch(setBookingStep(1));
        }}
      >
        Save draft
      </button>
    </div>
  );
}

describe("AppProviders auth bootstrap", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("sets unauthenticated when GET /auth/me fails on app start", async () => {
    render(
      <AppProviders>
        <AuthBootstrapProbe />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("unauthenticated");
    });
    expect(screen.getByTestId("email").textContent).toBe("none");
  });

  it("bootstraps user into Redux auth slice when session exists", async () => {
    setMockRoleCookie("admin");

    render(
      <AppProviders>
        <AuthBootstrapProbe />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("authenticated");
    });
    expect(screen.getByTestId("email").textContent).toBe("admin@example.com");
    expect(screen.getByTestId("role").textContent).toBe("admin");
  });

  it("persists only bookingDraft in sessionStorage across AppProviders remounts", async () => {
    setMockRoleCookie("guest");

    const { unmount } = render(
      <AppProviders>
        <AuthBootstrapProbe />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("authenticated");
    });

    await act(async () => {
      screen.getByRole("button", { name: "Save draft" }).click();
    });

    const raw = window.sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(window.sessionStorage.length).toBe(1);
    expect(JSON.parse(raw as string)).not.toHaveProperty("auth");

    unmount();

    render(
      <AppProviders>
        <AuthBootstrapProbe />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("draft-room").textContent).toBe("5");
      expect(screen.getByTestId("draft-step").textContent).toBe("1");
    });
  });
});
