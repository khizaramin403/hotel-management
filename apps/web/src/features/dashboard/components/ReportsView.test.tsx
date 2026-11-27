import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, type OccupancyReport, type SalesReport } from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import * as bookingsEndpoint from "@/lib/api/endpoints/bookings";
import { formatCalendarDate, parseCalendarDate } from "@/lib/datePicker";
import { formatPrice } from "@/lib/format";
import { teardownMocks } from "@/mocks";
import { clearMockRoleCookie, resetMockDb, setMockRoleCookie } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { makeStore } from "@/store";
import { setAuthUser } from "@/store/slices/authSlice";
import { formatOccupancyRate } from "../lib/dashboardFormat";
import {
  buildUpdatedReportsUrl,
  getDefaultReportsRange,
  getLast7DaysRange,
  getThisMonthRange,
  parseReportsSearchParams,
} from "../lib/reportsParams";
import { ReportsView } from "./ReportsView";

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

function renderReports(queryClient = createTestQueryClient()) {
  const store = makeStore();
  store.dispatch(
    setAuthUser({
      id: 3,
      name: "Hina Malik",
      email: "admin@example.com",
      role: "admin",
    }),
  );

  const renderTree = () => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AntdProvider>
          <ReportsView />
        </AntdProvider>
      </QueryClientProvider>
    </Provider>
  );

  const view = render(renderTree());

  return {
    store,
    queryClient,
    rerenderView: () => view.rerender(renderTree()),
    ...view,
  };
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

function buildDailyDates(from: string, to: string): string[] {
  const start = parseCalendarDate(from) ?? new Date();
  const end = parseCalendarDate(to) ?? start;
  const dates: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  while (cursor <= end) {
    dates.push(formatCalendarDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function makeSalesReport(from: string, to: string, zeroed = false): SalesReport {
  const dates = buildDailyDates(from, to);
  const daily = dates.map((date, index) => ({
    date,
    revenue: zeroed ? 0 : (index + 1) * 10000,
    bookings: zeroed ? 0 : (index % 3) + 1,
  }));

  return {
    from,
    to,
    totalRevenue: daily.reduce((sum, item) => sum + item.revenue, 0),
    bookingCount: daily.reduce((sum, item) => sum + item.bookings, 0),
    daily,
  };
}

function makeOccupancyReport(from: string, to: string, zeroed = false): OccupancyReport {
  const dates = buildDailyDates(from, to);
  const daily = dates.map((date, index) => ({
    date,
    occupiedRooms: zeroed ? 0 : (index % 8) + 2,
    rate: zeroed ? 0 : Math.min(100, 20 + ((index * 5) % 65)),
  }));
  const roomNights = daily.reduce((sum, item) => sum + item.occupiedRooms, 0);
  const availableRoomNights = dates.length * 12;

  return {
    from,
    to,
    occupancyRate: zeroed ? 0 : Math.round((roomNights / availableRoomNights) * 1000) / 10,
    roomNights,
    availableRoomNights,
    daily,
  };
}

describe("reportsParams helpers", () => {
  it("computes Last 7 days, Last 30 days default, and This month windows cleanly", () => {
    const fixedNow = new Date(2026, 10, 27, 10, 0, 0);

    expect(getLast7DaysRange(fixedNow)).toEqual({
      from: "2026-11-21",
      to: "2026-11-27",
    });
    expect(getDefaultReportsRange(fixedNow)).toEqual({
      from: "2026-10-29",
      to: "2026-11-27",
    });
    expect(getThisMonthRange(fixedNow)).toEqual({
      from: "2026-11-01",
      to: "2026-11-27",
    });
  });

  it("parses URL search params with fallback to last 30 days on missing or invalid dates", () => {
    const fixedNow = new Date(2026, 10, 27, 10, 0, 0);

    expect(parseReportsSearchParams(new URLSearchParams(""), fixedNow)).toEqual({
      from: "2026-10-29",
      to: "2026-11-27",
      activePreset: "last_30_days",
    });

    expect(
      parseReportsSearchParams(new URLSearchParams("from=2026-11-20&to=2026-11-10"), fixedNow),
    ).toEqual({
      from: "2026-10-29",
      to: "2026-11-27",
      activePreset: "last_30_days",
    });

    expect(
      parseReportsSearchParams(new URLSearchParams("from=2026-11-01&to=2026-11-27"), fixedNow),
    ).toEqual({
      from: "2026-11-01",
      to: "2026-11-27",
      activePreset: "this_month",
    });

    expect(buildUpdatedReportsUrl(new URLSearchParams(""), { from: "2026-11-21", to: "2026-11-27" })).toBe(
      "/dashboard/reports?from=2026-11-21&to=2026-11-27",
    );
  });
});

describe("ReportsView", () => {
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

    currentSearch = "";
    mockPush.mockReset();
    mockPush.mockImplementation((url: string) => {
      const queryIndex = url.indexOf("?");
      currentSearch = queryIndex >= 0 ? url.slice(queryIndex + 1) : "";
    });

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

  it("defaults to last 30 days, renders Sales & Occupancy stats, dynamic single-color charts, and 10-row paginated daily tables", async () => {
    const defaultRange = getDefaultReportsRange();
    const expectedSales = makeSalesReport(defaultRange.from, defaultRange.to);
    const expectedOccupancy = makeOccupancyReport(defaultRange.from, defaultRange.to);

    const salesSpy = vi
      .spyOn(bookingsEndpoint, "getSalesReport")
      .mockResolvedValueOnce(expectedSales);
    const occupancySpy = vi
      .spyOn(bookingsEndpoint, "getOccupancyReport")
      .mockResolvedValueOnce(expectedOccupancy);

    renderReports();

    await waitFor(() => {
      expect(screen.getByText(formatPrice(expectedSales.totalRevenue))).toBeDefined();
      expect(screen.getByText(String(expectedSales.bookingCount))).toBeDefined();
      expect(screen.getByText(formatOccupancyRate(expectedOccupancy.occupancyRate))).toBeDefined();
    });

    expect(salesSpy).toHaveBeenCalledWith(defaultRange);
    expect(occupancySpy).toHaveBeenCalledWith(defaultRange);

    const salesChart = await screen.findByTestId("sales-bar-chart");
    await waitFor(() => {
      const primaryBars = Array.from(salesChart.querySelectorAll("path[fill], rect[fill]")).filter(
        (el) => el.getAttribute("fill")?.toLowerCase() === "#1f4d45",
      );
      expect(primaryBars.length).toBeGreaterThan(0);
    });
    const salesGrid = Array.from(salesChart.querySelectorAll("line[stroke]")).filter(
      (el) => el.getAttribute("stroke")?.toLowerCase() === "#e7e5df",
    );
    expect(salesGrid.length).toBeGreaterThan(0);

    const occupancyChart = await screen.findByTestId("occupancy-chart");
    await waitFor(() => {
      const primaryLines = Array.from(
        occupancyChart.querySelectorAll("path[stroke], circle[fill]"),
      ).filter(
        (el) =>
          el.getAttribute("stroke")?.toLowerCase() === "#1f4d45" ||
          el.getAttribute("fill")?.toLowerCase() === "#1f4d45",
      );
      expect(primaryLines.length).toBeGreaterThan(0);
    });

    // Both daily tables display 10 rows per page and paginate across 30 days
    const salesTable = await screen.findByTestId("sales-report-table");
    const occupancyTable = await screen.findByTestId("occupancy-report-table");

    expect(salesTable.querySelectorAll("tbody tr[data-row-key]")).toHaveLength(10);
    expect(occupancyTable.querySelectorAll("tbody tr[data-row-key]")).toHaveLength(10);

    const page2Button = within(salesTable).getByTitle("2");
    fireEvent.click(page2Button);

    await waitFor(() => {
      expect(salesTable.querySelectorAll("tbody tr[data-row-key]")).toHaveLength(10);
      expect(within(salesTable).getByText(formatPrice(110000))).toBeDefined();
    });
  }, 25_000);

  it("changes URL search params and re-queries both reports when a RangePicker preset is selected", async () => {
    const defaultRange = getDefaultReportsRange();
    const last7Range = getLast7DaysRange();
    const thisMonthRange = getThisMonthRange();

    const salesSpy = vi
      .spyOn(bookingsEndpoint, "getSalesReport")
      .mockImplementation(async (params) => makeSalesReport(params.from, params.to));
    const occupancySpy = vi
      .spyOn(bookingsEndpoint, "getOccupancyReport")
      .mockImplementation(async (params) => makeOccupancyReport(params.from, params.to));

    const { rerenderView } = renderReports();

    await waitFor(() => {
      expect(salesSpy).toHaveBeenCalledWith(defaultRange);
      expect(occupancySpy).toHaveBeenCalledWith(defaultRange);
    });

    // Open RangePicker and pick "Last 7 days"
    const startInput = screen.getByLabelText("Date range");
    fireEvent.mouseDown(startInput);
    fireEvent.click(startInput);

    const last7Preset = await screen.findByText("Last 7 days");
    fireEvent.click(last7Preset);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        `/dashboard/reports?from=${last7Range.from}&to=${last7Range.to}`,
        { scroll: false },
      );
    });

    rerenderView();

    await waitFor(() => {
      expect(salesSpy).toHaveBeenCalledWith(last7Range);
      expect(occupancySpy).toHaveBeenCalledWith(last7Range);
    });

    const salesTable = await screen.findByTestId("sales-report-table");
    expect(salesTable.querySelectorAll("tbody tr[data-row-key]")).toHaveLength(7);

    // Switch to "This month" preset
    fireEvent.mouseDown(startInput);
    fireEvent.click(startInput);
    const thisMonthPreset = await screen.findByText("This month");
    fireEvent.click(thisMonthPreset);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        `/dashboard/reports?from=${thisMonthRange.from}&to=${thisMonthRange.to}`,
        { scroll: false },
      );
    });

    rerenderView();

    await waitFor(() => {
      expect(salesSpy).toHaveBeenCalledWith(thisMonthRange);
      expect(occupancySpy).toHaveBeenCalledWith(thisMonthRange);
    });
  }, 20_000);

  it("renders 'No bookings in this period' empty states cleanly from zero-booking periods and empty daily data", async () => {
    currentSearch = "from=2030-01-01&to=2030-01-07";

    renderReports();

    await waitFor(() => {
      const emptyMessages = screen.getAllByText("No bookings in this period");
      expect(emptyMessages).toHaveLength(2);
    });

    expect(screen.queryByTestId("sales-bar-chart")).toBeNull();
    expect(screen.queryByTestId("occupancy-chart")).toBeNull();
    expect(screen.queryByTestId("sales-report-table")).toBeNull();
    expect(screen.queryByTestId("occupancy-report-table")).toBeNull();
  });

  it("isolates per-block loading skeletons and error Alerts with retry without blocking the healthy block", async () => {
    const defaultRange = getDefaultReportsRange();
    const salesDeferred = createDeferred<SalesReport>();
    const occupancySpy = vi
      .spyOn(bookingsEndpoint, "getOccupancyReport")
      .mockRejectedValueOnce(
        new ApiClientError({
          status: 500,
          code: "INTERNAL_ERROR",
          message: "Occupancy unavailable",
        }),
      )
      .mockResolvedValueOnce(makeOccupancyReport(defaultRange.from, defaultRange.to));

    vi.spyOn(bookingsEndpoint, "getSalesReport").mockReturnValueOnce(salesDeferred.promise);

    renderReports();

    // Initially both blocks are loading independently
    expect(screen.getByRole("status", { name: "Loading sales report" })).toBeDefined();
    expect(screen.getByRole("status", { name: "Loading occupancy report" })).toBeDefined();

    // Occupancy fails while Sales is still loading
    await waitFor(() => {
      expect(screen.getByText("Could not load occupancy report")).toBeDefined();
    });
    expect(screen.getByRole("status", { name: "Loading sales report" })).toBeDefined();

    // Sales resolves cleanly even while Occupancy shows an error Alert
    const salesPayload = makeSalesReport(defaultRange.from, defaultRange.to);
    salesDeferred.resolve(salesPayload);

    await waitFor(() => {
      expect(screen.getByText(formatPrice(salesPayload.totalRevenue))).toBeDefined();
      expect(screen.getByTestId("sales-report-table")).toBeDefined();
    });
    expect(screen.getByText("Could not load occupancy report")).toBeDefined();

    // Retry Occupancy independently
    const occupancySection = screen.getByTestId("occupancy-report-section");
    fireEvent.click(within(occupancySection).getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(screen.getByTestId("occupancy-report-table")).toBeDefined();
      expect(screen.queryByText("Could not load occupancy report")).toBeNull();
    });
    expect(occupancySpy).toHaveBeenCalledTimes(2);
  });
});
