import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import * as roomsEndpoint from "@/lib/api/endpoints/rooms";
import { formatCalendarDate } from "@/lib/datePicker";
import { teardownMocks } from "@/mocks";
import { resetMockDb } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { makeStore } from "@/store";
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
    mockPush.mockReset();
    mockReplace.mockReset();
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "rooms");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
  });

  afterEach(() => {
    window.sessionStorage.clear();
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
});
