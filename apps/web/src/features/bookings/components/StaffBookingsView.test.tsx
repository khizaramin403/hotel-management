import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Booking } from "@hotel/shared";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import * as bookingsEndpoint from "@/lib/api/endpoints/bookings";
import { teardownMocks } from "@/mocks";
import { clearMockRoleCookie, resetMockDb, setMockRoleCookie } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { makeStore } from "@/store";
import { setAuthUser } from "@/store/slices/authSlice";
import { BookingRow } from "./BookingRow";
import { SEARCH_DEBOUNCE_MS } from "./StaffBookingsFilterBar";
import { StaffBookingsView } from "./StaffBookingsView";

const mockPush = vi.fn();
let currentSearch = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
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

function renderStaffBookings({
  queryClient = createTestQueryClient(),
}: {
  queryClient?: QueryClient;
} = {}) {
  const store = makeStore();
  store.dispatch(
    setAuthUser({
      id: 2,
      name: "Ali Raza",
      email: "staff@example.com",
      role: "staff",
    }),
  );

  const view = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AntdProvider>
          <StaffBookingsView />
        </AntdProvider>
      </QueryClientProvider>
    </Provider>,
  );

  return { store, queryClient, ...view };
}

function makeBooking(id: number, status: Booking["status"], guestName = "Sara Khan"): Booking {
  return {
    id,
    userId: 1,
    guestName,
    roomId: 5,
    roomNumber: "201",
    roomType: "Deluxe",
    checkIn: "2026-11-26",
    checkOut: "2026-11-28",
    guests: 2,
    nights: 2,
    subtotal: 30000,
    taxAmount: 3000,
    totalPrice: 33000,
    status,
    expiresAt: status === "pending" ? "2026-11-26T18:00:00.000Z" : null,
    createdAt: "2026-11-25T10:00:00.000Z",
    payment: status === "pending" ? null : { id: 500 + id, status: status === "cancelled" ? "refunded" : "paid" },
  };
}

describe("StaffBookingsView", () => {
  beforeEach(() => {
    mockPush.mockReset();
    currentSearch = "";
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth,rooms,bookings");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
    setMockRoleCookie("staff");
  });

  afterEach(() => {
    vi.useRealTimers();
    clearMockRoleCookie();
    vi.restoreAllMocks();
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("syncs status Chips, RangePicker dates, debounced search, and 10/20/50 pagination with URL params", async () => {
    currentSearch = "status=confirmed&from=2026-11-20&to=2026-11-30&q=Omar&page=2&limit=20";
    const listSpy = vi
      .spyOn(bookingsEndpoint, "listBookings")
      .mockResolvedValue({
        data: [makeBooking(1042, "confirmed", "Omar Sheikh")],
        meta: { page: 2, limit: 20, total: 25, totalPages: 2 },
      });

    const { rerender, store, queryClient } = renderStaffBookings();

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith({
        status: ["confirmed"],
        from: "2026-11-20",
        to: "2026-11-30",
        q: "Omar",
        page: 2,
        limit: 20,
      });
    });

    // Clicking Confirmed again toggles off status filter and resets page
    const statusGroup = screen.getByRole("group", { name: "Booking status filters" });
    const confirmedChip = within(statusGroup).getByRole("button", { name: "Confirmed" });
    expect(confirmedChip.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(confirmedChip);
    expect(mockPush).toHaveBeenCalledWith(
      "/dashboard/bookings?from=2026-11-20&to=2026-11-30&q=Omar&limit=20",
      { scroll: false },
    );

    // Clicking Pending sets status=pending and resets page
    fireEvent.click(within(statusGroup).getByRole("button", { name: "Pending" }));
    expect(mockPush).toHaveBeenCalledWith(
      "/dashboard/bookings?status=pending&from=2026-11-20&to=2026-11-30&q=Omar&limit=20",
      { scroll: false },
    );

    // Selecting page 1 in pagination preserves filters and limit
    const tableRegion = await screen.findByTestId("staff-bookings-table");
    fireEvent.click(within(tableRegion).getByRole("listitem", { name: "1" }));
    expect(mockPush).toHaveBeenCalledWith(
      "/dashboard/bookings?status=confirmed&from=2026-11-20&to=2026-11-30&q=Omar&limit=20",
      { scroll: false },
    );

    // Changing page size to 50 updates limit=50 and resets page
    const sizeChanger = tableRegion.querySelector(
      ".ant-pagination-options-size-changer .ant-select-selector",
    ) as HTMLElement;
    expect(sizeChanger).not.toBeNull();
    fireEvent.mouseDown(sizeChanger);
    const option50 = await screen.findByText("50 / page");
    fireEvent.click(option50);
    expect(mockPush).toHaveBeenCalledWith(
      "/dashboard/bookings?status=confirmed&from=2026-11-20&to=2026-11-30&q=Omar&limit=50",
      { scroll: false },
    );

    // Clearing RangePicker removes from & to from URL
    const rangeClear = document.querySelector(".ant-picker-clear") as HTMLElement;
    expect(rangeClear).not.toBeNull();
    fireEvent.mouseDown(rangeClear);
    fireEvent.mouseUp(rangeClear);
    fireEvent.click(rangeClear);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard/bookings?status=confirmed&q=Omar&limit=20", {
        scroll: false,
      });
    });

    // Reset URL to clean state and verify 300ms search debounce + RangePicker input selection
    currentSearch = "";
    rerender(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AntdProvider>
            <StaffBookingsView />
          </AntdProvider>
        </QueryClientProvider>
      </Provider>,
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    mockPush.mockClear();
    vi.useFakeTimers();

    const searchInput = screen.getByLabelText("Search");
    fireEvent.change(searchInput, { target: { value: "BK-1041" } });

    // Must not push before 300ms
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50);
    });
    expect(mockPush).not.toHaveBeenCalled();

    // Pushes at 300ms
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(mockPush).toHaveBeenCalledWith("/dashboard/bookings?q=BK-1041", { scroll: false });

    vi.useRealTimers();

    // Select RangePicker start & end dates -> updates from & to in URL
    const fromInput = screen.getByPlaceholderText("From date");
    const toInput = screen.getByPlaceholderText("To date");
    fireEvent.focus(fromInput);
    fireEvent.mouseDown(fromInput);
    fireEvent.change(fromInput, { target: { value: "2026-12-01" } });
    fireEvent.keyDown(fromInput, { key: "Enter", code: "Enter" });
    fireEvent.blur(fromInput);

    fireEvent.focus(toInput);
    fireEvent.mouseDown(toInput);
    fireEvent.change(toInput, { target: { value: "2026-12-05" } });
    fireEvent.keyDown(toInput, { key: "Enter", code: "Enter" });
    fireEvent.blur(toInput);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        "/dashboard/bookings?from=2026-12-01&to=2026-12-05",
        { scroll: false },
      );
    });
  }, 15_000);

  it("renders status-specific row actions in Table and memoized BookingRow cards below 768px", async () => {
    expect((BookingRow as unknown as { $$typeof?: symbol }).$$typeof).toBe(
      Symbol.for("react.memo"),
    );

    vi.spyOn(bookingsEndpoint, "listBookings").mockResolvedValueOnce({
      data: [
        makeBooking(2001, "pending", "Amina Noor"),
        makeBooking(2002, "confirmed", "Bilal Ahmed"),
        makeBooking(2003, "checked_in", "Sana Tariq"),
        makeBooking(2004, "checked_out", "Zain Ali"),
        makeBooking(2005, "cancelled", "Hira Khan"),
      ],
      meta: { page: 1, limit: 10, total: 5, totalPages: 1 },
    });

    renderStaffBookings();

    const tableRegion = await screen.findByTestId("staff-bookings-table");
    const mobileRegion = screen.getByTestId("staff-bookings-mobile-list");

    expect(tableRegion.className).toContain("hidden");
    expect(tableRegion.className).toContain("md:block");
    expect(mobileRegion.className).toContain("md:hidden");

    // Table headers include all 7 required columns
    for (const headerName of ["Reference", "Guest", "Room", "Dates", "Status", "Total", "Actions"]) {
      expect(within(tableRegion).getByRole("columnheader", { name: headerName })).toBeDefined();
    }

    // Verify action buttons per status in Desktop Table
    const pendingRow = within(tableRegion).getByText("BK-2001").closest("tr") as HTMLElement;
    expect(within(pendingRow).getByRole("button", { name: "View" })).toBeDefined();
    expect(within(pendingRow).getByRole("button", { name: "Cancel" })).toBeDefined();
    expect(within(pendingRow).queryByRole("button", { name: "Check in" })).toBeNull();
    expect(within(pendingRow).queryByRole("button", { name: "Check out" })).toBeNull();
    expect(within(pendingRow).queryByRole("button", { name: "Pay now" })).toBeNull();

    const confirmedRow = within(tableRegion).getByText("BK-2002").closest("tr") as HTMLElement;
    expect(within(confirmedRow).getByRole("button", { name: "View" })).toBeDefined();
    expect(within(confirmedRow).getByRole("button", { name: "Check in" })).toBeDefined();
    expect(within(confirmedRow).getByRole("button", { name: "Cancel" })).toBeDefined();
    expect(within(confirmedRow).queryByRole("button", { name: "Check out" })).toBeNull();

    const checkedInRow = within(tableRegion).getByText("BK-2003").closest("tr") as HTMLElement;
    expect(within(checkedInRow).getByRole("button", { name: "View" })).toBeDefined();
    expect(within(checkedInRow).getByRole("button", { name: "Check out" })).toBeDefined();
    expect(within(checkedInRow).queryByRole("button", { name: "Check in" })).toBeNull();
    expect(within(checkedInRow).queryByRole("button", { name: "Cancel" })).toBeNull();

    const checkedOutRow = within(tableRegion).getByText("BK-2004").closest("tr") as HTMLElement;
    expect(within(checkedOutRow).getByRole("button", { name: "View" })).toBeDefined();
    expect(within(checkedOutRow).queryByRole("button", { name: "Check in" })).toBeNull();
    expect(within(checkedOutRow).queryByRole("button", { name: "Check out" })).toBeNull();
    expect(within(checkedOutRow).queryByRole("button", { name: "Cancel" })).toBeNull();

    const cancelledRow = within(tableRegion).getByText("BK-2005").closest("tr") as HTMLElement;
    expect(within(cancelledRow).getByRole("button", { name: "View" })).toBeDefined();
    expect(within(cancelledRow).queryByRole("button", { name: "Check in" })).toBeNull();
    expect(within(cancelledRow).queryByRole("button", { name: "Check out" })).toBeNull();
    expect(within(cancelledRow).queryByRole("button", { name: "Cancel" })).toBeNull();

    // Mobile cards render BookingRow keyed by id with guest name and matching actions
    const mobileConfirmed = within(mobileRegion).getByTestId("booking-row-2002");
    expect(within(mobileConfirmed).getByText("Bilal Ahmed")).toBeDefined();
    expect(within(mobileConfirmed).getByRole("button", { name: "Check in" })).toBeDefined();
    expect(within(mobileConfirmed).getByRole("button", { name: "Cancel" })).toBeDefined();
  });

  it("performs View Drawer, Check in, Check out, Cancel Popconfirm with loading, toast, setQueryData, and handles 409 INVALID_STATE", async () => {
    const queryClient = createTestQueryClient();
    const listSpy = vi.spyOn(bookingsEndpoint, "listBookings");
    const updateStatusSpy = vi.spyOn(bookingsEndpoint, "updateBookingStatus");
    const cancelSpy = vi.spyOn(bookingsEndpoint, "cancelBooking");
    const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");

    renderStaffBookings({ queryClient });

    const tableRegion = await screen.findByTestId("staff-bookings-table");
    const callsBeforeActions = listSpy.mock.calls.length;

    // View opens 420px Drawer with full booking details
    const row1040 = within(tableRegion).getByText("BK-1040").closest("tr") as HTMLElement;
    fireEvent.click(within(row1040).getByRole("button", { name: "View" }));

    await waitFor(() => {
      expect(screen.getByText("Booking BK-1040")).toBeDefined();
      expect(screen.getByText("Price breakdown")).toBeDefined();
      expect(screen.getByText("Guest: Sara Khan")).toBeDefined();
    });

    // Check in confirmed BK-1040 -> loading, toast, setQueryData without refetch
    fireEvent.click(within(row1040).getByRole("button", { name: "Check in" }));

    await waitFor(() => {
      expect(updateStatusSpy).toHaveBeenCalledWith(1040, { status: "checked_in" });
      expect(screen.getByText("BK-1040 checked in.")).toBeDefined();
    });

    expect(setQueryDataSpy).toHaveBeenCalled();
    expect(listSpy.mock.calls.length).toBe(callsBeforeActions);

    const checkedInRow1040 = within(screen.getByTestId("staff-bookings-table"))
      .getByText("BK-1040")
      .closest("tr") as HTMLElement;
    expect(within(checkedInRow1040).getByText("Checked in")).toBeDefined();
    expect(within(checkedInRow1040).getByRole("button", { name: "Check out" })).toBeDefined();

    // Check out checked_in BK-1040 -> toast + setQueryData without refetch
    fireEvent.click(within(checkedInRow1040).getByRole("button", { name: "Check out" }));

    await waitFor(() => {
      expect(updateStatusSpy).toHaveBeenCalledWith(1040, { status: "checked_out" });
      expect(screen.getByText("BK-1040 checked out.")).toBeDefined();
    });

    expect(listSpy.mock.calls.length).toBe(callsBeforeActions);

    // 409 INVALID_STATE on Check in shows clear message
    updateStatusSpy.mockRejectedValueOnce(
      new ApiClientError({
        status: 409,
        code: "INVALID_STATE",
        message: "Cannot transition booking from checked_in to checked_in",
      }),
    );

    const row1041 = within(screen.getByTestId("staff-bookings-table"))
      .getByText("BK-1041")
      .closest("tr") as HTMLElement;
    fireEvent.click(within(row1041).getByRole("button", { name: "Check in" }));

    await waitFor(() => {
      expect(
        screen.getByText("This booking can only be checked in when its status is Confirmed."),
      ).toBeDefined();
    });

    // 409 INVALID_STATE on Cancel via Popconfirm shows clear message
    cancelSpy.mockRejectedValueOnce(
      new ApiClientError({
        status: 409,
        code: "INVALID_STATE",
        message: "Booking cannot be cancelled in its current status",
      }),
    );

    fireEvent.click(within(row1041).getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.getByText("Cancel this booking?")).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));

    await waitFor(() => {
      expect(
        screen.getByText("This booking can no longer be cancelled after check-in or completion."),
      ).toBeDefined();
    });

    // Successful Cancel on BK-1042 via Popconfirm -> toast + setQueryData
    const row1042 = within(screen.getByTestId("staff-bookings-table"))
      .getByText("BK-1042")
      .closest("tr") as HTMLElement;
    fireEvent.click(within(row1042).getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.getAllByText("Cancel this booking?").length).toBeGreaterThan(0);
    });
    const confirmCancelButtons = screen.getAllByRole("button", { name: "Cancel booking" });
    fireEvent.click(confirmCancelButtons[confirmCancelButtons.length - 1] as HTMLElement);

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith(1042);
      expect(screen.getByText("BK-1042 cancelled.")).toBeDefined();
    });
    expect(listSpy.mock.calls.length).toBe(callsBeforeActions);
  }, 15_000);

  it("renders skeleton rows, Empty with Clear filters, and error Alert with Try again", async () => {
    currentSearch = "status=pending";
    const listSpy = vi
      .spyOn(bookingsEndpoint, "listBookings")
      .mockResolvedValueOnce({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      })
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        data: [makeBooking(3001, "confirmed")],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

    const { rerender, store, queryClient } = renderStaffBookings();

    expect(screen.getByRole("status", { name: "Loading bookings" })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("No bookings match these filters")).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(mockPush).toHaveBeenCalledWith("/dashboard/bookings", { scroll: false });

    currentSearch = "status=confirmed";
    rerender(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AntdProvider>
            <StaffBookingsView />
          </AntdProvider>
        </QueryClientProvider>
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Could not load bookings")).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledTimes(3);
      expect(within(screen.getByTestId("staff-bookings-table")).getByText("BK-3001")).toBeDefined();
    });
  });

  it("closes BookingDetailDrawer via Escape and returns focus to the triggering View button", async () => {
    renderStaffBookings();

    const tableRegion = await screen.findByTestId("staff-bookings-table");
    const row1040 = within(tableRegion).getByText("BK-1040").closest("tr") as HTMLElement;
    const viewButton = within(row1040).getByRole("button", { name: "View" });

    viewButton.focus();
    expect(document.activeElement).toBe(viewButton);
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText("Booking BK-1040")).toBeDefined();
    });

    const drawerContent = document.querySelector(".ant-drawer-content") as HTMLElement | null;
    expect(drawerContent).not.toBeNull();
    fireEvent.keyDown(drawerContent!, { key: "Escape", code: "Escape" });

    await waitFor(() => {
      expect(document.activeElement).toBe(viewButton);
    });
  });
});
