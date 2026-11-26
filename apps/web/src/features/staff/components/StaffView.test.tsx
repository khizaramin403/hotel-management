import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { User } from "@hotel/shared";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, queryKeys } from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import * as authEndpoint from "@/lib/api/endpoints/auth";
import { teardownMocks } from "@/mocks";
import { clearMockRoleCookie, createMockUser, resetMockDb, setMockRoleCookie } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { makeStore } from "@/store";
import { setAuthUser } from "@/store/slices/authSlice";
import { StaffView } from "./StaffView";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let currentSearch = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function makeStaffUser(id: number, overrides: Partial<User> = {}): User {
  return {
    id,
    name: `Staff ${id}`,
    email: `staff${id}@example.com`,
    role: "staff",
    createdAt: "2026-11-19T09:30:00.000Z",
    ...overrides,
  };
}

function renderStaffView({
  queryClient = createTestQueryClient(),
}: {
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
          <StaffView />
        </AntdProvider>
      </QueryClientProvider>
    </Provider>,
  );

  return { store, queryClient, ...view };
}

describe("StaffView", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    currentSearch = "";
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

  it("renders table columns, formatted Created date, responsive mobile cards, and syncs 10/20/50 pagination with URL", async () => {
    currentSearch = "page=2&limit=20";
    const listSpy = vi.spyOn(authEndpoint, "listStaff").mockResolvedValue({
      data: [makeStaffUser(2, { name: "Ali Raza", email: "staff@example.com" })],
      meta: { page: 2, limit: 20, total: 25, totalPages: 2 },
    });

    renderStaffView();

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith({ page: 2, limit: 20 });
    });

    expect(screen.getByRole("heading", { name: "Staff" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Add staff" })).toBeDefined();

    const tableRegion = await screen.findByTestId("staff-table");
    expect(tableRegion.className).toContain("md:block");
    expect(tableRegion.className).toContain("dashboard-staff-table");

    for (const headerName of ["Name", "Email", "Created", "Actions"]) {
      expect(within(tableRegion).getByRole("columnheader", { name: headerName })).toBeDefined();
    }

    const row = within(tableRegion).getByText("Ali Raza").closest("tr") as HTMLElement;
    expect(within(row).getByText("staff@example.com")).toBeDefined();
    expect(within(row).getByText("19 Nov 2026")).toBeDefined();

    // Mobile cards (< 768px) also render the staff card
    const mobileList = screen.getByTestId("staff-mobile-list");
    expect(mobileList.className).toContain("md:hidden");
    const mobileCard = within(mobileList).getByTestId("staff-card-2");
    expect(within(mobileCard).getByText("Ali Raza")).toBeDefined();
    expect(within(mobileCard).getByText("Created 19 Nov 2026")).toBeDefined();

    // Pagination page click updates URL
    fireEvent.click(within(tableRegion).getByRole("listitem", { name: "1" }));
    expect(mockPush).toHaveBeenCalledWith("/dashboard/staff?limit=20", { scroll: false });

    // Page size change updates URL limit=50
    const sizeChanger = tableRegion.querySelector(
      ".ant-pagination-options-size-changer .ant-select-selector",
    ) as HTMLElement;
    fireEvent.mouseDown(sizeChanger);
    const option50 = await screen.findByText("50 / page");
    fireEvent.click(option50);
    expect(mockPush).toHaveBeenCalledWith("/dashboard/staff?limit=50", { scroll: false });
  }, 15_000);

  it("creates staff via dynamic StaffFormModal, surfaces 409 EMAIL_TAKEN, and deletes via Popconfirm using setQueryData", async () => {
    createMockUser({
      name: "Nadia Tariq",
      email: "nadia@example.com",
      password: "Password123",
      role: "staff",
    });

    const queryClient = createTestQueryClient();
    const listSpy = vi.spyOn(authEndpoint, "listStaff");
    const deleteSpy = vi.spyOn(authEndpoint, "deleteStaff");
    const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");

    renderStaffView({ queryClient });

    const tableRegion = await screen.findByTestId("staff-table");
    const initialListCalls = listSpy.mock.calls.length;

    // Open dynamically loaded StaffFormModal -> duplicate email hits MSW 409 EMAIL_TAKEN
    fireEvent.click(screen.getByRole("button", { name: "Add staff" }));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
      expect(screen.getByLabelText("Name")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Dup Staff" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "staff@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("An account with this email already exists")).toBeDefined();
      const saveBtn = screen.getByRole("button", { name: /Save$/ });
      expect(saveBtn.className).not.toContain("ant-btn-loading");
    });

    // Fix email and create cleanly -> closes modal, toast shown, table & mobile cards updated without refetch
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "zara@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Save$/ }));

    await waitFor(() => {
      expect(screen.getByText("Dup Staff added to staff.")).toBeDefined();
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    expect(within(screen.getByTestId("staff-table")).getByText("zara@example.com")).toBeDefined();
    expect(
      within(screen.getByTestId("staff-mobile-list")).getByText("zara@example.com"),
    ).toBeDefined();
    expect(listSpy.mock.calls.length).toBe(initialListCalls);
    expect(setQueryDataSpy).toHaveBeenCalled();

    // Delete with Popconfirm -> failure toast preserves row; retry/second delete removes row cleanly
    deleteSpy.mockRejectedValueOnce(
      new ApiClientError({
        status: 500,
        code: "INTERNAL_ERROR",
        message: "Failed to remove staff",
      }),
    );

    const aliRow = within(tableRegion).getByText("Ali Raza").closest("tr") as HTMLElement;
    fireEvent.click(within(aliRow).getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      const confirmBtn = screen
        .getAllByRole("button", { name: "Delete" })
        .find((btn) => btn.closest(".ant-popconfirm:not(.ant-popover-hidden)"));
      expect(confirmBtn).toBeDefined();
    });

    const firstConfirmBtn = screen
      .getAllByRole("button", { name: "Delete" })
      .find((btn) => btn.closest(".ant-popconfirm:not(.ant-popover-hidden)"));
    fireEvent.click(firstConfirmBtn as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText("Failed to remove staff")).toBeDefined();
    });
    expect(within(screen.getByTestId("staff-table")).getByText("Ali Raza")).toBeDefined();

    // Delete Nadia Tariq succeeds via MSW -> toast + removed from cache without refetch
    const nadiaRow = within(tableRegion).getByText("Nadia Tariq").closest("tr") as HTMLElement;
    fireEvent.click(within(nadiaRow).getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      const confirmButtons = screen
        .getAllByRole("button", { name: "Delete" })
        .filter((btn) => btn.closest(".ant-popconfirm:not(.ant-popover-hidden)"));
      expect(confirmButtons.length).toBeGreaterThan(0);
    });
    const confirmButtons = screen
      .getAllByRole("button", { name: "Delete" })
      .filter((btn) => btn.closest(".ant-popconfirm:not(.ant-popover-hidden)"));
    fireEvent.click(confirmButtons[confirmButtons.length - 1] as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText("Nadia Tariq removed.")).toBeDefined();
    });

    expect(within(screen.getByTestId("staff-table")).queryByText("Nadia Tariq")).toBeNull();
    expect(within(screen.getByTestId("staff-mobile-list")).queryByText("Nadia Tariq")).toBeNull();
    expect(listSpy.mock.calls.length).toBe(initialListCalls);

    const listCache = queryClient.getQueryData<authEndpoint.PaginatedResult<User>>(
      queryKeys.staff.list({ page: 1, limit: 10 }),
    );
    expect(listCache?.data.some((m) => m.name === "Nadia Tariq")).toBe(false);
  }, 15_000);

  it("renders skeleton rows, Empty with Add staff CTA, and error Alert with Try again", async () => {
    const listSpy = vi
      .spyOn(authEndpoint, "listStaff")
      .mockResolvedValueOnce({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      })
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        data: [makeStaffUser(2, { name: "Ali Raza", email: "staff@example.com" })],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

    const queryClient = createTestQueryClient();
    renderStaffView({ queryClient });

    expect(screen.getByRole("status", { name: "Loading staff" })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("No staff accounts yet")).toBeDefined();
    });

    // Next refetch triggers error Alert
    await queryClient.refetchQueries({ queryKey: queryKeys.staff.lists() });

    await waitFor(() => {
      expect(screen.getByText("Could not load staff")).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledTimes(3);
      expect(within(screen.getByTestId("staff-table")).getByText("Ali Raza")).toBeDefined();
    });
  }, 15_000);
});
