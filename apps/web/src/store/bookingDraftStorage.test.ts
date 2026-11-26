import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeStore } from "./index";
import {
  attachBookingDraftPersistence,
  BOOKING_DRAFT_STORAGE_KEY,
} from "./bookingDraftStorage";
import { setAuthUser } from "./slices/authSlice";
import {
  resetBookingDraft,
  setBookingDates,
  setBookingGuests,
  setBookingRoom,
  setBookingStep,
  setGuestDetails,
} from "./slices/bookingDraftSlice";

describe("bookingDraftStorage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("persists only the bookingDraft slice in sessionStorage and restores on fresh store", () => {
    const store1 = makeStore();
    const detach1 = attachBookingDraftPersistence(store1);

    store1.dispatch(
      setAuthUser({
        id: 1,
        name: "Ayesha Guest",
        email: "guest@example.com",
        role: "guest",
      }),
    );

    expect(window.sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY)).toBeNull();

    store1.dispatch(setBookingRoom(5));
    store1.dispatch(setBookingDates({ checkIn: "2026-12-20", checkOut: "2026-12-23" }));
    store1.dispatch(setBookingGuests(2));
    store1.dispatch(
      setGuestDetails({
        fullName: "Ayesha Guest",
        phone: "+92 300 0000000",
        email: "guest@example.com",
        specialRequests: "Quiet floor",
      }),
    );
    store1.dispatch(setBookingStep(1));
    detach1();

    expect(window.sessionStorage.length).toBe(1);
    const storedRaw = window.sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY);
    expect(storedRaw).not.toBeNull();
    const parsedStored = JSON.parse(storedRaw as string) as Record<string, unknown>;
    expect(Object.keys(parsedStored).sort()).toEqual([
      "checkIn",
      "checkOut",
      "guestDetails",
      "guests",
      "idempotencyKey",
      "roomId",
      "step",
    ]);
    expect("auth" in parsedStored).toBe(false);

    const store2 = makeStore();
    const detach2 = attachBookingDraftPersistence(store2);

    expect(store2.getState().bookingDraft).toEqual({
      roomId: 5,
      checkIn: "2026-12-20",
      checkOut: "2026-12-23",
      guests: 2,
      guestDetails: {
        fullName: "Ayesha Guest",
        phone: "+92 300 0000000",
        email: "guest@example.com",
        specialRequests: "Quiet floor",
      },
      idempotencyKey: null,
      step: 1,
    });
    expect(store2.getState().auth.user).toBeNull();

    store2.dispatch(resetBookingDraft());
    expect(window.sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY)).toBeNull();
    detach2();
  });

  it("ignores corrupt sessionStorage JSON cleanly", () => {
    window.sessionStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, "{invalid-json");
    const store = makeStore();
    const detach = attachBookingDraftPersistence(store);

    expect(store.getState().bookingDraft.roomId).toBeNull();
    expect(store.getState().bookingDraft.step).toBe(0);
    detach();
  });
});
