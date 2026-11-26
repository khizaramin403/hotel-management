import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
import { MyBookingsView } from "./MyBookingsView";

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

function renderMyBookings({
  queryClient = createTestQueryClient(),
}: {
  queryClient?: QueryClient;
} = {}) {
  const store = makeStore();
  store.dispatch(
    setAuthUser({
      id: 1,
      name: "Sara Khan",
      email: "guest@example.com",
      role: "guest",
    }),
  );

  const view = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AntdProvider>
          <MyBookingsView />
        </AntdProvider>
      </QueryClientProvider>
    </Provider>,
  );

  return { store, queryClient, ...view };
}

describe("MyBookingsView", () => {
  beforeEach(() => {
    mockPush.mockReset();
    currentSearch = "";
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth,rooms,bookings");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    vi.stubEnv("NEXT_PUBLIC_SHOW_DEV_PAYMENT", "true");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
    setMockRoleCookie("guest");
  });

  afterEach(() => {
    clearMockRoleCookie();
    vi.restoreAllMocks();
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("maps Upcoming, Past, and Cancelled tabs to status query params, supports pagination, and memoizes BookingRow", async () => {
    expect((BookingRow as unknown as { $$typeof?: symbol }).$$typeof).toBe(
      Symbol.for("react.memo"),
    );

    const listSpy = vi.spyOn(bookingsEndpoint, "listMyBookings");
    const { rerender, queryClient, store } = renderMyBookings();

    // Loading skeleton shown initially
    expect(screen.getByRole("status", { name: "Loading bookings" })).toBeDefined();

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith({
        status: ["pending", "confirmed", "checked_in"],
        page: 1,
        limit: 10,
      });
      expect(screen.getByTestId("my-bookings-table")).toBeDefined();
    });

    const tableRegion = screen.getByTestId("my-bookings-table");
    const mobileRegion = screen.getByTestId("my-bookings-mobile-list");
    expect(tableRegion.className).toContain("hidden");
    expect(tableRegion.className).toContain("md:block");
    expect(mobileRegion.className).toContain("md:hidden");
    expect(within(tableRegion).getByText("BK-1044")).toBeDefined();
    expect(within(mobileRegion).getByTestId("booking-row-1044")).toBeDefined();

    // Switch to Past tab -> updates URL status=checked_out&page=1
    fireEvent.click(screen.getByRole("tab", { name: "Past" }));
    expect(mockPush).toHaveBeenCalledWith("/my-bookings?status=checked_out&page=1");

    currentSearch = "status=checked_out&page=1";
    rerender(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AntdProvider>
            <MyBookingsView />
          </AntdProvider>
        </QueryClientProvider>
      </Provider>,
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith({
        status: ["checked_out"],
        page: 1,
        limit: 10,
      });
      expect(within(screen.getByTestId("my-bookings-table")).getByText("BK-1032")).toBeDefined();
    });

    // Switch to Cancelled tab -> updates URL status=cancelled&page=1
    fireEvent.click(screen.getByRole("tab", { name: "Cancelled" }));
    expect(mockPush).toHaveBeenCalledWith("/my-bookings?status=cancelled&page=1");

    currentSearch = "status=cancelled&page=1";
    rerender(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AntdProvider>
            <MyBookingsView />
          </AntdProvider>
        </QueryClientProvider>
      </Provider>,
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith({
        status: ["cancelled"],
        page: 1,
        limit: 10,
      });
      expect(within(screen.getByTestId("my-bookings-table")).getByText("BK-1036")).toBeDefined();
    });
  }, 15_000);

  it("supports Dates column sorting and 10-per-page server pagination bound to URL page param", async () => {
    const sampleBookings = await bookingsEndpoint.listMyBookings({
      status: ["pending", "confirmed", "checked_in"],
      page: 1,
      limit: 10,
    });

    vi.spyOn(bookingsEndpoint, "listMyBookings").mockResolvedValue({
      data: sampleBookings.data,
      meta: { page: 1, limit: 10, total: 15, totalPages: 2 },
    });

    renderMyBookings();

    const tableRegion = await screen.findByTestId("my-bookings-table");
    const datesHeader = within(tableRegion).getAllByRole("columnheader", { name: /Dates/ })[0];
    expect(datesHeader).toBeDefined();
    fireEvent.click(datesHeader as HTMLElement);

    // Seed upcoming bookings sorted ascending by checkIn put earliest checkIn (-1d, BK-1038) first
    const bodyRows = Array.from(tableRegion.querySelectorAll("tbody tr[data-row-key]"));
    expect(bodyRows.length).toBe(5);
    expect(bodyRows[0]?.getAttribute("data-row-key")).toBe("1038");

    fireEvent.click(within(tableRegion).getByRole("listitem", { name: "2" }));

    expect(mockPush).toHaveBeenCalledWith(
      "/my-bookings?status=pending%2Cconfirmed%2Cchecked_in&page=2",
    );
  });

  it("opens 420px View Drawer, cancels via Popconfirm using setQueryData without refetching, and handles 409 INVALID_STATE", async () => {
    const queryClient = createTestQueryClient();
    const listSpy = vi.spyOn(bookingsEndpoint, "listMyBookings");
    const cancelSpy = vi.spyOn(bookingsEndpoint, "cancelBooking");
    const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");

    renderMyBookings({ queryClient });

    const tableRegion = await screen.findByTestId("my-bookings-table");
    const row1041 = within(tableRegion).getByText("BK-1041").closest("tr") as HTMLElement;

    // View opens Drawer with full breakdown, dates, guests, payment & status tags
    fireEvent.click(within(row1041).getByRole("button", { name: "View" }));

    await waitFor(() => {
      expect(screen.getByText("Booking BK-1041")).toBeDefined();
      expect(screen.getByText("Price breakdown")).toBeDefined();
      expect(screen.getByText("Payment status")).toBeDefined();
      expect(screen.getByText("Paid")).toBeDefined();
    });

    // Cancel from row Popconfirm
    const listCallsBeforeCancel = listSpy.mock.calls.length;
    fireEvent.click(within(row1041).getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.getByText("Cancel this booking?")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith(1041);
      expect(screen.getByText("Booking cancelled.")).toBeDefined();
    });

    // Updated via setQueryData with zero list refetch
    expect(setQueryDataSpy).toHaveBeenCalled();
    expect(listSpy.mock.calls.length).toBe(listCallsBeforeCancel);
    expect(within(screen.getByTestId("my-bookings-table")).queryByText("BK-1041")).toBeNull();

    // Verify 409 INVALID_STATE shows clear message
    cancelSpy.mockRejectedValueOnce(
      new ApiClientError({
        status: 409,
        code: "INVALID_STATE",
        message: "Booking cannot be cancelled",
      }),
    );

    const row1040 = within(screen.getByTestId("my-bookings-table"))
      .getByText("BK-1040")
      .closest("tr") as HTMLElement;
    fireEvent.click(within(row1040).getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.getByText("Cancel this booking?")).toBeDefined();
    });
    const confirmButtons = screen.getAllByRole("button", { name: "Cancel booking" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1] as HTMLElement);

    await waitFor(() => {
      expect(
        screen.getByText("This booking can no longer be cancelled after check-in or completion."),
      ).toBeDefined();
    });
  });

  it("reuses the shared payment-waiting flow for Pay now on pending bookings and updates status", async () => {
    const startPaySpy = vi.spyOn(bookingsEndpoint, "startBookingPayment");
    const simulateSpy = vi.spyOn(bookingsEndpoint, "simulatePayment");

    renderMyBookings();

    const tableRegion = await screen.findByTestId("my-bookings-table");
    const row1044 = within(tableRegion).getByText("BK-1044").closest("tr") as HTMLElement;

    expect(within(row1044).getByText("Pending")).toBeDefined();
    fireEvent.click(within(row1044).getByRole("button", { name: "Pay now" }));

    await waitFor(() => {
      expect(startPaySpy).toHaveBeenCalledWith(1044);
      expect(screen.getByText("Waiting for payment confirmation")).toBeDefined();
      expect(screen.getByRole("button", { name: "Simulate paid" })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Simulate paid" }));

    await waitFor(() => {
      expect(simulateSpy).toHaveBeenCalledWith(expect.any(Number), { status: "paid" });
      expect(screen.getByText("Booking confirmed. A confirmation was sent to your email.")).toBeDefined();
    });

    const updatedRow1044 = within(screen.getByTestId("my-bookings-table"))
      .getByText("BK-1044")
      .closest("tr") as HTMLElement;
    expect(within(updatedRow1044).getByText("Confirmed")).toBeDefined();
    expect(within(updatedRow1044).queryByRole("button", { name: "Pay now" })).toBeNull();
  });

  it("renders Empty 'No upcoming bookings' with Browse rooms and error Alert with Try again", async () => {
    const listSpy = vi
      .spyOn(bookingsEndpoint, "listMyBookings")
      .mockResolvedValueOnce({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      })
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

    const { rerender, queryClient, store } = renderMyBookings();

    await waitFor(() => {
      expect(screen.getByText("No upcoming bookings")).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Browse rooms" }));
    expect(mockPush).toHaveBeenCalledWith("/");

    currentSearch = "status=checked_out&page=1";
    rerender(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AntdProvider>
            <MyBookingsView />
          </AntdProvider>
        </QueryClientProvider>
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Could not load your bookings")).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledTimes(3);
      expect(screen.getByText("No past bookings")).toBeDefined();
    });
  });
});
