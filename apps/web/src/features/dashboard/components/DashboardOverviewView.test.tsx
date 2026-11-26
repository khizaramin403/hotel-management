import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Booking } from "@hotel/shared";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatPrice } from "@/lib/format";
import { ApiClientError, type OccupancyReport, type SalesReport } from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import * as bookingsEndpoint from "@/lib/api/endpoints/bookings";
import { teardownMocks } from "@/mocks";
import { clearMockRoleCookie, getMockBookings, resetMockDb, setMockRoleCookie } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { makeStore } from "@/store";
import { setAuthUser } from "@/store/slices/authSlice";
import {
  formatOccupancyRate,
  formatStatCount,
  getLast30DaysRange,
} from "../lib/dashboardFormat";
import { DashboardOverviewView } from "./DashboardOverviewView";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
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

function renderDashboard(queryClient = createTestQueryClient()) {
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
          <DashboardOverviewView />
        </AntdProvider>
      </QueryClientProvider>
    </Provider>,
  );

  return { store, queryClient, ...view };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const SAMPLE_SALES_REPORT: SalesReport = {
  from: "2026-10-28",
  to: "2026-11-26",
  totalRevenue: 1250000,
  bookingCount: 184,
  daily: [
    { date: "2026-11-24", revenue: 350000, bookings: 4 },
    { date: "2026-11-25", revenue: 420000, bookings: 5 },
    { date: "2026-11-26", revenue: 480000, bookings: 6 },
  ],
};

const SAMPLE_OCCUPANCY_REPORT: OccupancyReport = {
  from: "2026-10-28",
  to: "2026-11-26",
  occupancyRate: 78.4,
  roomNights: 282,
  availableRoomNights: 360,
  daily: [{ date: "2026-11-26", occupiedRooms: 10, rate: 83.3 }],
};

function makeBooking(id: number, overrides: Partial<Booking> = {}): Booking {
  return {
    id,
    userId: 1,
    guestName: "Sara Khan",
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
    status: "confirmed",
    expiresAt: null,
    createdAt: "2026-11-25T10:00:00.000Z",
    payment: { id: 501, status: "paid" },
    ...overrides,
  };
}

describe("dashboardFormat helpers", () => {
  it("computes an inclusive 30-day calendar window ending today", () => {
    const range = getLast30DaysRange(new Date(2026, 2, 5, 14, 0, 0));
    expect(range).toEqual({
      from: "2026-02-04",
      to: "2026-03-05",
      today: "2026-03-05",
    });
  });

  it("formats counts and occupancy percentages cleanly", () => {
    expect(formatStatCount(184)).toBe("184");
    expect(formatStatCount(1250)).toBe("1,250");
    expect(formatOccupancyRate(78)).toBe("78%");
    expect(formatOccupancyRate(78.44)).toBe("78.4%");
  });
});

describe("DashboardOverviewView", () => {
  let originalGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function mockChartRect() {
      if (this.classList?.contains("recharts-responsive-container")) {
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: 520,
          bottom: 280,
          width: 520,
          height: 280,
          toJSON: () => ({}),
        } as DOMRect;
      }
      return originalGetBoundingClientRect.call(this);
    };

    mockPush.mockReset();
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth,rooms,bookings");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
    setMockRoleCookie("admin");
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    clearMockRoleCookie();
    vi.restoreAllMocks();
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("renders 4 formatted stat cards, responsive grid classes, Recharts bar chart (#1F4D45 / #E7E5DF), and 5-row compact Recent bookings table", async () => {
    const { from, to, today } = getLast30DaysRange();

    const salesSpy = vi
      .spyOn(bookingsEndpoint, "getSalesReport")
      .mockResolvedValueOnce(SAMPLE_SALES_REPORT);
    const occupancySpy = vi
      .spyOn(bookingsEndpoint, "getOccupancyReport")
      .mockResolvedValueOnce(SAMPLE_OCCUPANCY_REPORT);
    const listSpy = vi
      .spyOn(bookingsEndpoint, "listBookings")
      .mockImplementation(async (params) => {
        if (params?.status === "confirmed") {
          return {
            data: [makeBooking(1040)],
            meta: { page: 1, limit: 10, total: 12, totalPages: 2 },
          };
        }
        return {
          data: [
            makeBooking(1045, { roomType: "Deluxe", roomNumber: "204", status: "confirmed", totalPrice: 45000 }),
            makeBooking(1044, { roomType: "Suite", roomNumber: "301", status: "pending", totalPrice: 30000 }),
            makeBooking(1043, { roomType: "Single", roomNumber: "102", status: "checked_in", totalPrice: 12000 }),
            makeBooking(1042, { roomType: "Family", roomNumber: "210", status: "checked_out", totalPrice: 60000 }),
            makeBooking(1041, { roomType: "Double", roomNumber: "103", status: "cancelled", totalPrice: 22000 }),
            makeBooking(1040, { roomType: "Single", roomNumber: "101", status: "confirmed", totalPrice: 13200 }),
          ],
          meta: { page: 1, limit: 5, total: 14, totalPages: 3 },
        };
      });

    const { container } = renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("PKR 1,250,000")).toBeDefined();
      expect(screen.getByText("184")).toBeDefined();
      expect(screen.getByText("78.4%")).toBeDefined();
      expect(screen.getByText("12")).toBeDefined();
    });

    // Stat cards responsive grid: 1 col mobile, 2 cols at 576px (sm), 4 cols at 1200px (xl)
    const cardsGrid = screen.getByText("Revenue").closest(".grid");
    expect(cardsGrid?.className).toContain("grid-cols-1");
    expect(cardsGrid?.className).toContain("sm:grid-cols-2");
    expect(cardsGrid?.className).toContain("xl:grid-cols-4");

    // Exact endpoint queries
    expect(salesSpy).toHaveBeenCalledWith({ from, to });
    expect(occupancySpy).toHaveBeenCalledWith({ from, to });
    expect(listSpy).toHaveBeenCalledWith({ status: "confirmed", from: today, to: today });
    expect(listSpy).toHaveBeenCalledWith({ page: 1, limit: 5 });

    // Sales bar chart renders dynamically with Recharts single color #1F4D45 and gridlines #E7E5DF
    const chartRegion = await screen.findByTestId("sales-bar-chart");
    await waitFor(() => {
      const bars = Array.from(chartRegion.querySelectorAll("path[fill], rect[fill]")).filter(
        (el) => el.getAttribute("fill")?.toLowerCase() === "#1f4d45",
      );
      expect(bars.length).toBeGreaterThan(0);
    });
    const gridLines = Array.from(chartRegion.querySelectorAll("line[stroke]")).filter(
      (el) => el.getAttribute("stroke")?.toLowerCase() === "#e7e5df",
    );
    expect(gridLines.length).toBeGreaterThan(0);

    // Recent bookings compact table shows 5 rows with StatusTag and View all button
    const recentTableWrapper = await screen.findByTestId("recent-bookings-table");
    expect(recentTableWrapper.className).toContain("dashboard-compact-table");
    const rows = recentTableWrapper.querySelectorAll("tbody tr[data-row-key]");
    expect(rows).toHaveLength(5);
    expect(within(recentTableWrapper).getByText("BK-1045")).toBeDefined();
    expect(within(recentTableWrapper).getByText("Confirmed")).toBeDefined();
    expect(within(recentTableWrapper).getByText("PKR 45,000")).toBeDefined();
    expect(within(recentTableWrapper).queryByText("BK-1040")).toBeNull();

    const viewAllLink = screen.getByRole("link", { name: "View all" });
    expect(viewAllLink.getAttribute("href")).toBe("/dashboard/bookings");
    fireEvent.click(viewAllLink);
    expect(mockPush).toHaveBeenCalledWith("/dashboard/bookings");

    // Card titles & labels match DESIGN.md section 8.7
    expect(container.textContent).toContain("Sales per day");
    expect(container.textContent).toContain("Recent bookings");
    expect(container.textContent).toContain("Check-ins today");
  }, 15_000);

  it("loads from the mock bookings handlers end-to-end when admin is authenticated", async () => {
    renderDashboard();

    const { from, to } = getLast30DaysRange();
    const expectedRevenueBookings = getMockBookings().filter(
      (b) =>
        (b.status === "confirmed" || b.status === "checked_in" || b.status === "checked_out") &&
        b.checkIn >= from &&
        b.checkIn <= to,
    );
    const expectedTotalRevenue = expectedRevenueBookings.reduce(
      (sum, booking) => sum + booking.totalPrice,
      0,
    );

    await waitFor(() => {
      expect(screen.getByTestId("recent-bookings-table")).toBeDefined();
      expect(screen.getByText(formatPrice(expectedTotalRevenue))).toBeDefined();
      expect(screen.getByText(String(expectedRevenueBookings.length))).toBeDefined();
    });

    const recentTable = screen.getByTestId("recent-bookings-table");
    expect(recentTable.querySelectorAll("tbody tr[data-row-key]")).toHaveLength(5);
    expect(within(recentTable).getByText("BK-1044")).toBeDefined();
  });

  it("renders independent loading Skeletons per block and resolves them independently", async () => {
    const salesDeferred = createDeferred<SalesReport>();
    const occupancyDeferred = createDeferred<OccupancyReport>();
    const checkInsDeferred = createDeferred<bookingsEndpoint.BookingsListResult>();
    const recentDeferred = createDeferred<bookingsEndpoint.BookingsListResult>();

    vi.spyOn(bookingsEndpoint, "getSalesReport").mockReturnValueOnce(salesDeferred.promise);
    vi.spyOn(bookingsEndpoint, "getOccupancyReport").mockReturnValueOnce(occupancyDeferred.promise);
    vi.spyOn(bookingsEndpoint, "listBookings").mockImplementation((params) => {
      if (params?.status === "confirmed") {
        return checkInsDeferred.promise;
      }
      return recentDeferred.promise;
    });

    renderDashboard();

    expect(screen.getByRole("status", { name: "Loading Revenue" })).toBeDefined();
    expect(screen.getByRole("status", { name: "Loading Bookings" })).toBeDefined();
    expect(screen.getByRole("status", { name: "Loading Occupancy" })).toBeDefined();
    expect(screen.getByRole("status", { name: "Loading Check-ins today" })).toBeDefined();
    expect(screen.getByRole("status", { name: "Loading sales chart" })).toBeDefined();
    expect(screen.getByRole("status", { name: "Loading recent bookings" })).toBeDefined();

    // Resolve only occupancy -> Occupancy renders while all other blocks stay in Skeleton state
    occupancyDeferred.resolve(SAMPLE_OCCUPANCY_REPORT);

    await waitFor(() => {
      expect(screen.getByText("78.4%")).toBeDefined();
    });
    expect(screen.queryByRole("status", { name: "Loading Occupancy" })).toBeNull();
    expect(screen.getByRole("status", { name: "Loading Revenue" })).toBeDefined();
    expect(screen.getByRole("status", { name: "Loading Check-ins today" })).toBeDefined();
    expect(screen.getByRole("status", { name: "Loading sales chart" })).toBeDefined();
    expect(screen.getByRole("status", { name: "Loading recent bookings" })).toBeDefined();
  });

  it("isolates block failures with per-block error Alerts and retries without breaking other blocks", async () => {
    const occupancySpy = vi
      .spyOn(bookingsEndpoint, "getOccupancyReport")
      .mockRejectedValueOnce(
        new ApiClientError({
          status: 500,
          code: "INTERNAL_ERROR",
          message: "Occupancy unavailable",
        }),
      )
      .mockResolvedValueOnce({
        ...SAMPLE_OCCUPANCY_REPORT,
        occupancyRate: 64.5,
      });

    vi.spyOn(bookingsEndpoint, "getSalesReport").mockResolvedValueOnce(SAMPLE_SALES_REPORT);
    const listSpy = vi
      .spyOn(bookingsEndpoint, "listBookings")
      .mockImplementation(async (params) => {
        if (params?.status === "confirmed") {
          return {
            data: [makeBooking(1040)],
            meta: { page: 1, limit: 10, total: 4, totalPages: 1 },
          };
        }
        throw new ApiClientError({
          status: 500,
          code: "INTERNAL_ERROR",
          message: "Recent bookings unavailable",
        });
      });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Could not load occupancy")).toBeDefined();
      expect(screen.getByText("Could not load recent bookings")).toBeDefined();
    });

    // Healthy blocks still display their data
    expect(screen.getByText("PKR 1,250,000")).toBeDefined();
    expect(screen.getByText("184")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
    expect(await screen.findByTestId("sales-bar-chart")).toBeDefined();

    // Retry Occupancy independently
    const occupancyAlert = screen.getByText("Could not load occupancy").closest(".ant-alert") as HTMLElement;
    fireEvent.click(within(occupancyAlert).getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(screen.getByText("64.5%")).toBeDefined();
    });
    expect(occupancySpy).toHaveBeenCalledTimes(2);

    // Retry Recent bookings independently
    listSpy.mockResolvedValueOnce({
      data: [makeBooking(1048, { roomType: "Suite", roomNumber: "302" })],
      meta: { page: 1, limit: 5, total: 1, totalPages: 1 },
    });

    const bookingsAlert = screen.getByText("Could not load recent bookings").closest(".ant-alert") as HTMLElement;
    fireEvent.click(within(bookingsAlert).getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(screen.getByTestId("recent-bookings-table")).toBeDefined();
      expect(screen.getByText("BK-1048")).toBeDefined();
    });
  });
});
