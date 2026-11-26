import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { User } from "@hotel/shared";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, queryKeys, type PaginatedResult } from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import * as authEndpoint from "@/lib/api/endpoints/auth";
import { teardownMocks } from "@/mocks";
import { clearMockRoleCookie, resetMockDb, setMockRoleCookie } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { makeStore } from "@/store";
import { setAuthUser } from "@/store/slices/authSlice";
import { StaffFormModal } from "./StaffFormModal";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderStaffFormModal({
  onClose = vi.fn(),
  queryClient = createTestQueryClient(),
}: {
  onClose?: () => void;
  queryClient?: QueryClient;
} = {}) {
  const store = makeStore();
  store.dispatch(
    setAuthUser({
      id: 3,
      name: "Hina Malik",
      email: "admin@example.com",
      role: "admin",
    }),
  );

  const view = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AntdProvider>
          <StaffFormModal onClose={onClose} />
        </AntdProvider>
      </QueryClientProvider>
    </Provider>,
  );

  return { store, queryClient, onClose, ...view };
}

describe("StaffFormModal", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
    setMockRoleCookie("admin");
  });

  afterEach(() => {
    clearMockRoleCookie();
    vi.restoreAllMocks();
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("validates name, email, and strong password with helper text and toggles password visibility", async () => {
    const createSpy = vi.spyOn(authEndpoint, "createStaff");

    renderStaffFormModal();

    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Add staff");
    const modalRoot = dialog.closest(".ant-modal") as HTMLElement | null;
    expect(modalRoot?.style.width).toBe("520px");
    expect(
      screen.getByText("At least 8 characters with a letter and a number."),
    ).toBeDefined();

    // Password toggle button swaps type between password and text
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(passwordInput.type).toBe("text");

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "not-an-email" } });
    fireEvent.change(passwordInput, { target: { value: "short" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("Name must be at least 2 characters")).toBeDefined();
      expect(screen.getByText("Invalid email address")).toBeDefined();
      expect(screen.getByText("Password must be at least 8 characters")).toBeDefined();
    });

    expect(createSpy).not.toHaveBeenCalled();
  }, 15_000);

  it("creates staff account, shows toast, closes modal, and updates staff cache via setQueryData", async () => {
    const queryClient = createTestQueryClient();
    const listKey = queryKeys.staff.list({ page: 1, limit: 10 });
    queryClient.setQueryData<PaginatedResult<User>>(listKey, {
      data: [
        {
          id: 2,
          name: "Ali Raza",
          email: "staff@example.com",
          role: "staff",
          createdAt: "2026-11-19T09:30:00.000Z",
        },
      ],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const createSpy = vi.spyOn(authEndpoint, "createStaff");
    const listSpy = vi.spyOn(authEndpoint, "listStaff");
    const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");
    const onClose = vi.fn();

    renderStaffFormModal({ onClose, queryClient });

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Bilal Ahmed" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "bilal@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password123" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: "Bilal Ahmed",
        email: "bilal@example.com",
        password: "Password123",
      });
      expect(screen.getByText("Bilal Ahmed added to staff.")).toBeDefined();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    expect(setQueryDataSpy).toHaveBeenCalled();
    expect(listSpy).not.toHaveBeenCalled();

    const updatedCache = queryClient.getQueryData<PaginatedResult<User>>(listKey);
    expect(updatedCache?.meta.total).toBe(2);
    expect(updatedCache?.data[0]?.email).toBe("bilal@example.com");
  }, 15_000);

  it("maps 409 EMAIL_TAKEN onto the email field and keeps the modal open", async () => {
    const createSpy = vi.spyOn(authEndpoint, "createStaff").mockRejectedValueOnce(
      new ApiClientError({
        status: 409,
        code: "EMAIL_TAKEN",
        message: "An account with this email already exists",
      }),
    );
    const onClose = vi.fn();

    renderStaffFormModal({ onClose });

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ali Duplicate" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "staff@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password123" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByText("An account with this email already exists")).toBeDefined();
    });

    const emailInput = screen.getByLabelText("Email");
    expect(emailInput.getAttribute("aria-invalid")).toBe("true");
    expect(emailInput.getAttribute("aria-describedby")).toBe("staff-form-email-error");
    expect(onClose).not.toHaveBeenCalled();
  }, 15_000);
});
