import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { RoomDetail } from "@hotel/shared";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockInitForTests } from "@/lib/api/client";
import * as roomsEndpoint from "@/lib/api/endpoints/rooms";
import { formatCalendarDate } from "@/lib/datePicker";
import { teardownMocks } from "@/mocks";
import { resetMockDb } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { makeStore } from "@/store";
import { clearAuth, setAuthUser } from "@/store/slices/authSlice";
import { BookingCard } from "./BookingCard";

const mockPush = vi.fn();
let currentSearch = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

function addDaysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatCalendarDate(date);
}

const SAMPLE_ROOM: RoomDetail = {
  id: 5,
  number: "201",
  type: "Deluxe",
  pricePerNight: 15000,
  capacity: 2,
  facilities: ["Wi-Fi", "Air conditioning"],
  description: "Deluxe room with balcony.",
  isActive: true,
  coverImage: null,
  images: [],
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderBookingCard({
  room = SAMPLE_ROOM,
  store = makeStore(),
  queryClient = createTestQueryClient(),
}: {
  room?: RoomDetail;
  store?: ReturnType<typeof makeStore>;
  queryClient?: QueryClient;
} = {}) {
  const view = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AntdProvider>
          <BookingCard room={room} />
        </AntdProvider>
      </QueryClientProvider>
    </Provider>,
  );

  return { store, queryClient, ...view };
}

describe("BookingCard", () => {
  beforeEach(() => {
    mockPush.mockReset();
    currentSearch = "";
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "rooms");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("renders sticky desktop card and 72px mobile bar, debounces availability by 300ms, and shows breakdown when available", async () => {
    const availSpy = vi.spyOn(roomsEndpoint, "checkRoomAvailability");

    renderBookingCard();

    const desktopCard = screen.getByTestId("desktop-booking-card");
    expect(desktopCard.className).toContain("lg:sticky");
    expect(desktopCard.className).toContain("lg:top-[88px]");

    const mobileBar = screen.getByTestId("mobile-booking-bar");
    expect(mobileBar.className).toContain("h-[72px]");
    expect(mobileBar.className).toContain("lg:hidden");

    const desktopBookBtn = screen.getByTestId("desktop-book-now") as HTMLButtonElement;
    expect(desktopBookBtn.disabled).toBe(true);
    expect(availSpy).not.toHaveBeenCalled();

    const checkIn = addDaysFromToday(12);
    const checkOut = addDaysFromToday(15);

    const checkInInput = screen.getByPlaceholderText("Check-in") as HTMLInputElement;
    const checkOutInput = screen.getByPlaceholderText("Check-out") as HTMLInputElement;

    fireEvent.focus(checkInInput);
    fireEvent.change(checkInInput, { target: { value: checkIn } });
    fireEvent.keyDown(checkInInput, { key: "Enter", code: "Enter" });
    fireEvent.blur(checkInInput);

    fireEvent.focus(checkOutInput);
    fireEvent.change(checkOutInput, { target: { value: checkOut } });
    fireEvent.keyDown(checkOutInput, { key: "Enter", code: "Enter" });
    fireEvent.blur(checkOutInput);

    // Must remain debounced before 300 ms elapses.
    expect(availSpy).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(availSpy).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(availSpy).toHaveBeenCalledWith(5, { checkIn, checkOut });
      expect(screen.getByText("Available")).toBeDefined();
    });

    expect(within(desktopCard).getByText("3 nights x 15,000")).toBeDefined();
    expect(within(desktopCard).getByText("PKR 45,000")).toBeDefined();
    expect(within(desktopCard).getByText("PKR 4,500")).toBeDefined();
    expect(within(desktopCard).getByText("PKR 49,500")).toBeDefined();
    expect(within(mobileBar).getByText("PKR 49,500")).toBeDefined();
    expect(desktopBookBtn.disabled).toBe(false);
  });

  it("shows 'Not available for these dates' and keeps Book now disabled when dates overlap a booking", async () => {
    const conflictCheckIn = addDaysFromToday(1);
    const conflictCheckOut = addDaysFromToday(3);
    currentSearch = `checkIn=${conflictCheckIn}&checkOut=${conflictCheckOut}&guests=2`;

    const conflictRoom: RoomDetail = {
      ...SAMPLE_ROOM,
      id: 7,
      number: "203",
      capacity: 3,
    };

    renderBookingCard({ room: conflictRoom });

    await waitFor(() => {
      expect(screen.getByText("Not available for these dates")).toBeDefined();
    });

    const desktopBookBtn = screen.getByTestId("desktop-book-now") as HTMLButtonElement;
    expect(desktopBookBtn.disabled).toBe(true);
  });

  it("redirects logged-out user to /login?next=<room page with dates and guests> on Book now", async () => {
    const checkIn = addDaysFromToday(15);
    const checkOut = addDaysFromToday(17);
    currentSearch = `checkIn=${checkIn}&checkOut=${checkOut}&guests=5`;

    const store = makeStore();
    store.dispatch(clearAuth());

    renderBookingCard({ store });

    // Guests clamped to room.capacity (2)
    expect(screen.getByTestId("booking-card-guests-value").textContent).toBe("2 guests");

    await waitFor(() => {
      expect(screen.getByText("Available")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("desktop-book-now"));

    const expectedReturnUrl = `/rooms/5?checkIn=${checkIn}&checkOut=${checkOut}&guests=2`;
    expect(mockPush).toHaveBeenCalledWith(`/login?next=${encodeURIComponent(expectedReturnUrl)}`);
  });

  it("saves room, dates, and guests in bookingDraft and redirects to /book/[roomId] for guest", async () => {
    const checkIn = addDaysFromToday(16);
    const checkOut = addDaysFromToday(18);
    currentSearch = `checkIn=${checkIn}&checkOut=${checkOut}&guests=2`;

    const store = makeStore();
    store.dispatch(
      setAuthUser({
        id: 1,
        name: "Sara Khan",
        email: "guest@example.com",
        role: "guest",
      }),
    );

    renderBookingCard({ store });

    await waitFor(() => {
      expect(screen.getByText("Available")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("desktop-book-now"));

    expect(store.getState().bookingDraft.roomId).toBe(5);
    expect(store.getState().bookingDraft.checkIn).toBe(checkIn);
    expect(store.getState().bookingDraft.checkOut).toBe(checkOut);
    expect(store.getState().bookingDraft.guests).toBe(2);
    expect(mockPush).toHaveBeenCalledWith("/book/5");
  });

  it("disables Book now with 'Guests only' Tooltip for staff and admin", async () => {
    const checkIn = addDaysFromToday(19);
    const checkOut = addDaysFromToday(21);
    currentSearch = `checkIn=${checkIn}&checkOut=${checkOut}&guests=1`;

    const store = makeStore();
    store.dispatch(
      setAuthUser({
        id: 2,
        name: "Staff User",
        email: "staff@example.com",
        role: "staff",
      }),
    );

    renderBookingCard({ store });

    await waitFor(() => {
      expect(screen.getByText("Available")).toBeDefined();
    });

    const desktopBookBtn = screen.getByTestId("desktop-book-now") as HTMLButtonElement;
    expect(desktopBookBtn.disabled).toBe(true);

    const tooltipWrapper = desktopBookBtn.parentElement as HTMLElement;
    fireEvent.mouseEnter(tooltipWrapper);

    await waitFor(() => {
      expect(screen.getByText("Guests only")).toBeDefined();
    });
  });

  it("opens the Drawer below 992px when clicking the mobile date selector trigger", async () => {
    renderBookingCard();

    fireEvent.click(screen.getByRole("button", { name: "Choose stay dates and guests" }));

    await waitFor(() => {
      expect(screen.getByText("Select dates and guests")).toBeDefined();
      expect(screen.getByTestId("drawer-book-now")).toBeDefined();
    });
  });
});
