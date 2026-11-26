import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, queryKeys } from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import * as bookingsEndpoint from "@/lib/api/endpoints/bookings";
import * as roomsEndpoint from "@/lib/api/endpoints/rooms";
import { formatCalendarDate } from "@/lib/datePicker";
import { teardownMocks } from "@/mocks";
import { clearMockRoleCookie, resetMockDb, setMockRoleCookie } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { makeStore } from "@/store";
import { BOOKING_DRAFT_STORAGE_KEY } from "@/store/bookingDraftStorage";
import { setAuthUser } from "@/store/slices/authSlice";
import {
  setBookingDates,
  setBookingGuests,
  setBookingRoom,
  setBookingStep,
} from "@/store/slices/bookingDraftSlice";
import { BookingFlowView } from "./BookingFlowView";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

function addDaysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatCalendarDate(date);
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function seedAuthenticatedGuest(store: ReturnType<typeof makeStore>) {
  store.dispatch(
    setAuthUser({
      id: 1,
      name: "Sara Khan",
      email: "sara@example.com",
      role: "guest",
    }),
  );
}

function renderBookingFlow({
  roomId = 5,
  store = makeStore(),
  queryClient = createTestQueryClient(),
}: {
  roomId?: number;
  store?: ReturnType<typeof makeStore>;
  queryClient?: QueryClient;
} = {}) {
  const view = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AntdProvider>
          <BookingFlowView roomId={roomId} />
        </AntdProvider>
      </QueryClientProvider>
    </Provider>,
  );

  return { store, queryClient, ...view };
}

describe("BookingFlowView", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    clearMockRoleCookie();
    mockPush.mockReset();
    mockReplace.mockReset();
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth,rooms,bookings");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    vi.stubEnv("NEXT_PUBLIC_SHOW_DEV_PAYMENT", "true");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    clearMockRoleCookie();
    vi.useRealTimers();
    vi.restoreAllMocks();
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("redirects back to the room page when bookingDraft is empty", async () => {
    const store = makeStore();
    seedAuthenticatedGuest(store);

    renderBookingFlow({ roomId: 5, store });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/rooms/5");
    });
  });

  it("redirects back to the room page when bookingDraft belongs to another room", async () => {
    const store = makeStore();
    seedAuthenticatedGuest(store);
    store.dispatch(setBookingRoom(3));
    store.dispatch(
      setBookingDates({ checkIn: addDaysFromToday(10), checkOut: addDaysFromToday(12) }),
    );
    store.dispatch(setBookingGuests(2));

    renderBookingFlow({ roomId: 5, store });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/rooms/5");
    });
  });

  it("re-checks availability on enter, shows Step 1 summary with Change links and sticky Summary card, and blocks Continue if unavailable", async () => {
    const checkIn = addDaysFromToday(1);
    const checkOut = addDaysFromToday(3);

    const queryClient = createTestQueryClient();
    // Pre-seed stale/cached available response; entering /book/[roomId] must re-check!
    queryClient.setQueryData(queryKeys.rooms.availability(7, { checkIn, checkOut }), {
      available: true,
      nights: 2,
      subtotal: 35000,
      taxAmount: 3500,
      totalPrice: 38500,
    });

    const availSpy = vi.spyOn(roomsEndpoint, "checkRoomAvailability");

    const store = makeStore();
    seedAuthenticatedGuest(store);
    store.dispatch(setBookingRoom(7));
    store.dispatch(setBookingDates({ checkIn, checkOut }));
    store.dispatch(setBookingGuests(2));
    store.dispatch(setBookingStep(0));

    renderBookingFlow({ roomId: 7, store, queryClient });

    await waitFor(() => {
      expect(availSpy).toHaveBeenCalledWith(7, { checkIn, checkOut });
      expect(
        screen.getByText("This room was just booked for these dates. Choose other dates."),
      ).toBeDefined();
    });

    const summaryCard = screen.getByTestId("booking-summary-card");
    const summaryAside = summaryCard.parentElement as HTMLElement;
    expect(summaryAside.className).toContain("order-1");
    expect(summaryAside.className).toContain("lg:order-2");
    expect(summaryAside.className).toContain("lg:sticky");
    expect(summaryAside.className).toContain("lg:top-[88px]");
    expect(within(summaryCard).getByText("Deluxe · Room 203")).toBeDefined();
    expect(within(summaryCard).getByText("2 nights x 17,500")).toBeDefined();
    expect(within(summaryCard).getByText("PKR 3,500")).toBeDefined();
    expect(within(summaryCard).getByText("PKR 38,500")).toBeDefined();

    const changeLinks = screen.getAllByRole("link", { name: /^Change/ });
    expect(changeLinks.length).toBeGreaterThanOrEqual(3);
    for (const link of changeLinks) {
      expect(link.getAttribute("href")).toBe(
        `/rooms/7?checkIn=${checkIn}&checkOut=${checkOut}&guests=2`,
      );
    }

    const continueButton = screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
    expect(continueButton.disabled).toBe(true);
  });

  it("navigates Room -> Details -> Payment, validates Details form, preserves draft on Back and sessionStorage refresh", async () => {
    const checkIn = addDaysFromToday(12);
    const checkOut = addDaysFromToday(15);

    const store = makeStore();
    seedAuthenticatedGuest(store);
    store.dispatch(setBookingRoom(5));
    store.dispatch(setBookingDates({ checkIn, checkOut }));
    store.dispatch(setBookingGuests(2));
    store.dispatch(setBookingStep(0));

    const { unmount } = renderBookingFlow({ roomId: 5, store });

    await waitFor(() => {
      expect(screen.getByText("Available")).toBeDefined();
    });

    const continueStep1Btn = screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
    expect(continueStep1Btn.disabled).toBe(false);
    fireEvent.click(continueStep1Btn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Guest details" })).toBeDefined();
    });
    expect(store.getState().bookingDraft.step).toBe(1);

    const fullNameInput = screen.getByLabelText("Full name") as HTMLInputElement;
    const phoneInput = screen.getByLabelText("Phone") as HTMLInputElement;
    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    const requestsInput = screen.getByLabelText("Special requests (optional)") as HTMLTextAreaElement;

    // Prefilled name and email from auth user
    expect(fullNameInput.value).toBe("Sara Khan");
    expect(emailInput.value).toBe("sara@example.com");

    // Attempt invalid submit (empty phone + invalid email)
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("Enter a valid phone number")).toBeDefined();
      expect(screen.getByText("Invalid email address")).toBeDefined();
    });
    expect(phoneInput.getAttribute("aria-invalid")).toBe("true");
    expect(emailInput.getAttribute("aria-invalid")).toBe("true");
    expect(store.getState().bookingDraft.step).toBe(1);

    // Fix inputs with optional special requests left empty
    fireEvent.change(phoneInput, { target: { value: "+92 300 0000000" } });
    fireEvent.change(emailInput, { target: { value: "sara@example.com" } });
    fireEvent.change(requestsInput, { target: { value: "Late check-in" } });

    // Clicking Back returns to Step 1 Room and retains entered details
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Confirm room details" })).toBeDefined();
    });
    expect(store.getState().bookingDraft.step).toBe(0);
    expect(store.getState().bookingDraft.guestDetails.phone).toBe("+92 300 0000000");

    // Continue back to Step 2 Details and submit valid form
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Guest details" })).toBeDefined();
    });
    expect((screen.getByLabelText("Phone") as HTMLInputElement).value).toBe("+92 300 0000000");

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(store.getState().bookingDraft.step).toBe(2);
      expect(screen.getByRole("heading", { name: "Payment" })).toBeDefined();
    });

    // Simulate full page refresh with a fresh store + restored sessionStorage draft
    unmount();
    const freshStore = makeStore();
    seedAuthenticatedGuest(freshStore);

    renderBookingFlow({ roomId: 5, store: freshStore });

    await waitFor(() => {
      expect(freshStore.getState().bookingDraft.roomId).toBe(5);
      expect(freshStore.getState().bookingDraft.step).toBe(2);
      expect(freshStore.getState().bookingDraft.guestDetails.phone).toBe("+92 300 0000000");
      expect(screen.getByRole("heading", { name: "Payment" })).toBeDefined();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("completes the mock payment flow with polling and clears draft without redirecting", async () => {
    setMockRoleCookie("guest");
    const checkIn = addDaysFromToday(14);
    const checkOut = addDaysFromToday(17);

    const createSpy = vi.spyOn(bookingsEndpoint, "createBooking");
    const startPaySpy = vi.spyOn(bookingsEndpoint, "startBookingPayment");
    const getBookingSpy = vi.spyOn(bookingsEndpoint, "getBooking");

    const store = makeStore();
    seedAuthenticatedGuest(store);
    store.dispatch(setBookingRoom(5));
    store.dispatch(setBookingDates({ checkIn, checkOut }));
    store.dispatch(setBookingGuests(2));
    store.dispatch(setBookingStep(2));

    renderBookingFlow({ roomId: 5, store });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Payment" })).toBeDefined();
    });
    expect(screen.getByText("Payment is confirmed by our payment provider.")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Pay now" }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(startPaySpy).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("payment-waiting-card")).toBeDefined();
    });

    const sentKey = createSpy.mock.calls[0]?.[1];
    expect(sentKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    await waitFor(
      () => {
        expect(screen.getByTestId("booking-result-card")).toBeDefined();
      },
      { timeout: 6000 },
    );

    expect(getBookingSpy).toHaveBeenCalled();
    expect(screen.getByTestId("booking-reference").textContent).toMatch(/^BK-\d+$/);
    expect(store.getState().bookingDraft.roomId).toBeNull();
    expect(window.sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY)).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "View booking" }));
    expect(mockPush).toHaveBeenCalledWith("/my-bookings");

    fireEvent.click(screen.getByRole("button", { name: "Back to rooms" }));
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("supports dev simulate paid/failed buttons and shows 60s waiting alert when confirmation delays", async () => {
    setMockRoleCookie("guest");
    const checkIn = addDaysFromToday(18);
    const checkOut = addDaysFromToday(20);

    const simulateSpy = vi.spyOn(bookingsEndpoint, "simulatePayment");

    const store = makeStore();
    seedAuthenticatedGuest(store);
    store.dispatch(setBookingRoom(5));
    store.dispatch(setBookingDates({ checkIn, checkOut }));
    store.dispatch(setBookingGuests(2));
    store.dispatch(setBookingStep(2));

    renderBookingFlow({ roomId: 5, store });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Pay now" })).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Pay now" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Simulate failed" })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Simulate failed" }));

    await waitFor(() => {
      expect(simulateSpy).toHaveBeenCalledWith(expect.any(Number), { status: "failed" });
      expect(screen.getByText("Payment was declined by the payment provider.")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Pay now" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Simulate paid" })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Simulate paid" }));

    await waitFor(() => {
      expect(simulateSpy).toHaveBeenCalledWith(expect.any(Number), { status: "paid" });
      expect(screen.getByTestId("booking-result-card")).toBeDefined();
    });
  });

  it("hides dev buttons when disabled and shows 60s waiting alert when confirmation delays", async () => {
    setMockRoleCookie("guest");
    const checkIn = addDaysFromToday(19);
    const checkOut = addDaysFromToday(21);

    vi.stubEnv("NEXT_PUBLIC_SHOW_DEV_PAYMENT", "false");
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(bookingsEndpoint, "createBooking").mockResolvedValueOnce({
      id: 2050,
      userId: 1,
      guestName: "Sara Khan",
      roomId: 5,
      roomNumber: "201",
      roomType: "Deluxe",
      checkIn,
      checkOut,
      guests: 2,
      nights: 2,
      subtotal: 30000,
      taxAmount: 3000,
      totalPrice: 33000,
      status: "pending",
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
      createdAt: new Date().toISOString(),
      payment: null,
    });
    vi.spyOn(bookingsEndpoint, "startBookingPayment").mockResolvedValueOnce({
      paymentId: 880,
      amount: 33000,
      status: "pending",
    });
    vi.spyOn(bookingsEndpoint, "getBooking").mockResolvedValue({
      id: 2050,
      userId: 1,
      guestName: "Sara Khan",
      roomId: 5,
      roomNumber: "201",
      roomType: "Deluxe",
      checkIn,
      checkOut,
      guests: 2,
      nights: 2,
      subtotal: 30000,
      taxAmount: 3000,
      totalPrice: 33000,
      status: "pending",
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
      createdAt: new Date().toISOString(),
      payment: { id: 880, status: "pending" },
    });

    const slowStore = makeStore();
    seedAuthenticatedGuest(slowStore);
    slowStore.dispatch(setBookingRoom(5));
    slowStore.dispatch(setBookingDates({ checkIn, checkOut }));
    slowStore.dispatch(setBookingGuests(2));
    slowStore.dispatch(setBookingStep(2));

    renderBookingFlow({ roomId: 5, store: slowStore });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Pay now" })).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Pay now" }));

    await waitFor(() => {
      expect(screen.getByText("Waiting for payment confirmation")).toBeDefined();
    });
    expect(screen.queryByRole("button", { name: "Simulate paid" })).toBeNull();

    await vi.advanceTimersByTimeAsync(60_000);

    await waitFor(() => {
      expect(
        screen.getByText("We are still waiting for confirmation. You can check My bookings."),
      ).toBeDefined();
    });
  });

  it("shows the 409 ROOM_NOT_AVAILABLE alert with a link back to the room", async () => {
    setMockRoleCookie("guest");
    const checkIn = addDaysFromToday(1);
    const checkOut = addDaysFromToday(3);

    const store = makeStore();
    seedAuthenticatedGuest(store);
    store.dispatch(setBookingRoom(7));
    store.dispatch(setBookingDates({ checkIn, checkOut }));
    store.dispatch(setBookingGuests(2));
    store.dispatch(setBookingStep(2));

    renderBookingFlow({ roomId: 7, store });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Pay now" })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Pay now" }));

    await waitFor(() => {
      expect(
        screen.getByText("This room was just booked for these dates. Choose other dates."),
      ).toBeDefined();
    });

    const backLink = screen.getByRole("link", { name: "Back to room" });
    expect(backLink.getAttribute("href")).toBe(
      `/rooms/7?checkIn=${checkIn}&checkOut=${checkOut}&guests=2`,
    );
  });

  it("reuses the same Idempotency-Key UUID on retry after failure and handles 422 field errors", async () => {
    setMockRoleCookie("guest");
    const checkIn = addDaysFromToday(22);
    const checkOut = addDaysFromToday(24);

    const realCreateBooking = bookingsEndpoint.createBooking;
    const createSpy = vi
      .spyOn(bookingsEndpoint, "createBooking")
      .mockRejectedValueOnce(
        new ApiClientError({
          status: 500,
          code: "INTERNAL_ERROR",
          message: "Temporary server issue",
        }),
      )
      .mockImplementation((input, key) => realCreateBooking(input, key));

    const store = makeStore();
    seedAuthenticatedGuest(store);
    store.dispatch(setBookingRoom(5));
    store.dispatch(setBookingDates({ checkIn, checkOut }));
    store.dispatch(setBookingGuests(2));
    store.dispatch(setBookingStep(2));

    renderBookingFlow({ roomId: 5, store });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Pay now" })).toBeDefined();
    });

    // First click fails (500) -> toast shown, idempotency key preserved in draft
    fireEvent.click(screen.getByRole("button", { name: "Pay now" }));

    await waitFor(() => {
      expect(screen.getByText("Temporary server issue")).toBeDefined();
      const retryBtn = screen.getByRole("button", { name: /Pay now/i }) as HTMLButtonElement;
      expect(retryBtn.disabled).toBe(false);
    });

    const firstKey = createSpy.mock.calls[0]?.[1];
    expect(firstKey).toBeDefined();
    expect(store.getState().bookingDraft.idempotencyKey).toBe(firstKey);

    // Retry click -> exact same Idempotency-Key reused
    fireEvent.click(screen.getByRole("button", { name: /Pay now/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId("payment-waiting-card")).toBeDefined();
    });
    expect(createSpy.mock.calls[1]?.[1]).toBe(firstKey);

    // Confirm dev payment to clean pending mock timers before finishing test
    fireEvent.click(screen.getByRole("button", { name: "Simulate paid" }));
    await waitFor(() => {
      expect(screen.getByTestId("booking-result-card")).toBeDefined();
    });
  });

  it("displays 422 validation field errors when server rejects booking payload", async () => {
    setMockRoleCookie("guest");
    const checkIn = addDaysFromToday(25);
    const checkOut = addDaysFromToday(27);

    const validationStore = makeStore();
    seedAuthenticatedGuest(validationStore);
    validationStore.dispatch(setBookingRoom(1));
    validationStore.dispatch(setBookingDates({ checkIn, checkOut }));
    validationStore.dispatch(setBookingGuests(4)); // Room 1 capacity is 1 -> 422
    validationStore.dispatch(setBookingStep(2));

    renderBookingFlow({ roomId: 1, store: validationStore });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Pay now" })).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Pay now" }));

    await waitFor(() => {
      expect(screen.getByText("Check your booking selection")).toBeDefined();
      expect(screen.getByText("Guests: Room capacity is 1 guests")).toBeDefined();
    });
  });
});
