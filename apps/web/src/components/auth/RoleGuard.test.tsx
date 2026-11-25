import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeStore } from "@/store";
import { clearAuth, setAuthLoading, setAuthUser } from "@/store/slices/authSlice";
import { RoleGuard } from "./RoleGuard";

const mockReplace = vi.fn();
const mockPush = vi.fn();
let currentPathname = "/my-bookings";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  usePathname: () => currentPathname,
}));

describe("RoleGuard", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockPush.mockReset();
    currentPathname = "/my-bookings";
    window.history.replaceState({}, "", "/my-bookings");
  });

  it("renders loading skeleton while auth state is loading", () => {
    const store = makeStore();
    store.dispatch(setAuthLoading());

    render(
      <Provider store={store}>
        <RoleGuard allowedRoles={["guest"]}>
          <div data-testid="protected-content">Guest content</div>
        </RoleGuard>
      </Provider>,
    );

    expect(screen.getByRole("status", { name: "Loading page" })).toBeDefined();
    expect(screen.queryByTestId("protected-content")).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects logged-out users to /login with encoded next query", async () => {
    currentPathname = "/my-bookings";
    window.history.replaceState({}, "", "/my-bookings?tab=upcoming");
    const store = makeStore();
    store.dispatch(clearAuth());

    render(
      <Provider store={store}>
        <RoleGuard allowedRoles={["guest"]}>
          <div data-testid="protected-content">Guest content</div>
        </RoleGuard>
      </Provider>,
    );

    expect(screen.queryByTestId("protected-content")).toBeNull();
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fmy-bookings%3Ftab%3Dupcoming");
    });
  });

  it("renders 403 Result with Back to home button when role is disallowed", () => {
    currentPathname = "/dashboard/rooms";
    window.history.replaceState({}, "", "/dashboard/rooms");
    const store = makeStore();
    store.dispatch(
      setAuthUser({
        id: 2,
        name: "Reception Staff",
        email: "staff@hotel.test",
        role: "staff",
      }),
    );

    render(
      <Provider store={store}>
        <RoleGuard allowedRoles={["staff", "admin"]} enforceRouteRole>
          <div data-testid="protected-content">Rooms admin</div>
        </RoleGuard>
      </Provider>,
    );

    expect(screen.queryByTestId("protected-content")).toBeNull();
    expect(screen.getByText("You do not have access")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Back to home" }));
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("renders 403 Result when guest visits dashboard route", () => {
    currentPathname = "/dashboard/bookings";
    window.history.replaceState({}, "", "/dashboard/bookings");
    const store = makeStore();
    store.dispatch(
      setAuthUser({
        id: 3,
        name: "Guest User",
        email: "guest@hotel.test",
        role: "guest",
      }),
    );

    render(
      <Provider store={store}>
        <RoleGuard allowedRoles={["staff", "admin"]} enforceRouteRole>
          <div data-testid="protected-content">Staff bookings</div>
        </RoleGuard>
      </Provider>,
    );

    expect(screen.queryByTestId("protected-content")).toBeNull();
    expect(screen.getByText("You do not have access")).toBeDefined();
  });

  it("renders protected children when user role is authorized", () => {
    currentPathname = "/my-bookings";
    const store = makeStore();
    store.dispatch(
      setAuthUser({
        id: 3,
        name: "Guest User",
        email: "guest@hotel.test",
        role: "guest",
      }),
    );

    render(
      <Provider store={store}>
        <RoleGuard allowedRoles={["guest"]}>
          <div data-testid="protected-content">Guest content</div>
        </RoleGuard>
      </Provider>,
    );

    expect(screen.getByTestId("protected-content").textContent).toBe("Guest content");
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
