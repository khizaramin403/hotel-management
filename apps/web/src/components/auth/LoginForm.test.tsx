import { QueryClient } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockInitForTests } from "@/lib/api/client";
import { teardownMocks } from "@/mocks";
import { resetMockDb } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { makeStore } from "@/store";
import { performClientLogout } from "@/components/layout/layoutUtils";
import { LoginForm } from "./LoginForm";

const mockReplace = vi.fn();
const mockPush = vi.fn();
let currentSearch = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

function renderLoginForm(store = makeStore()) {
  const view = render(
    <Provider store={store}>
      <AntdProvider>
        <LoginForm />
      </AntdProvider>
    </Provider>,
  );
  return { store, unmount: view.unmount };
}

describe("LoginForm", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockPush.mockReset();
    currentSearch = "";
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
  });

  afterEach(() => {
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("shows validation messages and toggles password visibility with aria-label", async () => {
    renderLoginForm();

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    const toggleButton = screen.getByRole("button", { name: "Show password" });

    expect(passwordInput.type).toBe("password");
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeDefined();

    fireEvent.change(emailInput, { target: { value: "not-an-email" } });
    fireEvent.blur(emailInput);
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeDefined();
      expect(screen.getByText("Password is required")).toBeDefined();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("shows inline Alert when credentials are incorrect", async () => {
    renderLoginForm();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "guest@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "WrongPass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(screen.getByText("Email or password is incorrect.")).toBeDefined();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("maps 422 server validation details onto matching form fields", async () => {
    const postSpy = vi
      .spyOn(await import("@/lib/api/endpoints/auth"), "login")
      .mockRejectedValueOnce(
        new (await import("@/lib/api/errors")).ApiClientError({
          status: 422,
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: [{ field: "email", message: "Server rejected email format" }],
        }),
      );

    renderLoginForm();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "guest@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Passw0rd!123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(screen.getByText("Server rejected email format")).toBeDefined();
    });
    postSpy.mockRestore();
  });

  it("signs in guest, staff, and admin seed accounts in mock mode and redirects by role", async () => {
    const cases: Array<{
      email: string;
      expectedRole: "guest" | "staff" | "admin";
      expectedRedirect: string;
    }> = [
      { email: "guest@example.com", expectedRole: "guest", expectedRedirect: "/" },
      {
        email: "staff@example.com",
        expectedRole: "staff",
        expectedRedirect: "/dashboard/bookings",
      },
      { email: "admin@example.com", expectedRole: "admin", expectedRedirect: "/dashboard" },
    ];

    for (const entry of cases) {
      mockReplace.mockReset();
      const store = makeStore();
      const view = render(
        <Provider store={store}>
          <AntdProvider>
            <LoginForm />
          </AntdProvider>
        </Provider>,
      );

      fireEvent.change(screen.getByLabelText("Email"), { target: { value: entry.email } });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "Passw0rd!123" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Log in" }));

      await waitFor(() => {
        expect(store.getState().auth.status).toBe("authenticated");
        expect(store.getState().auth.user?.role).toBe(entry.expectedRole);
        expect(mockReplace).toHaveBeenCalledWith(entry.expectedRedirect);
      });
      expect(document.cookie).toContain(`mock_role=${entry.expectedRole}`);
      view.unmount();
    }
  });

  it("redirects to allowed next param and blocks disallowed next routes by role", async () => {
    currentSearch = "?next=%2Fbook%2F2";
    const first = renderLoginForm();
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "guest@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Passw0rd!123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(first.store.getState().auth.status).toBe("authenticated");
      expect(mockReplace).toHaveBeenCalledWith("/book/2");
    });
    first.unmount();

    mockReplace.mockReset();
    currentSearch = "?next=%2Fdashboard%2Frooms";
    const second = renderLoginForm();
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "staff@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Passw0rd!123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(second.store.getState().auth.status).toBe("authenticated");
      expect(mockReplace).toHaveBeenCalledWith("/dashboard/bookings");
    });
    second.unmount();
  });

  it("clears Redux auth state, mock cookie, and query cache on logout", async () => {
    const { store } = renderLoginForm();
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "guest@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Passw0rd!123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(store.getState().auth.status).toBe("authenticated");
    });

    const queryClient = new QueryClient();
    queryClient.setQueryData(["rooms", "list"], { items: [] });
    const clearSpy = vi.spyOn(queryClient, "clear");

    await performClientLogout(store.dispatch, queryClient);

    expect(store.getState().auth.status).toBe("unauthenticated");
    expect(store.getState().auth.user).toBeNull();
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(["rooms", "list"])).toBeUndefined();
    expect(document.cookie).not.toContain("mock_role=guest");
  });
});
