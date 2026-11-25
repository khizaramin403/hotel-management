import { describe, expect, it } from "vitest";
import {
  bookingDraftReducer,
  resetBookingDraft,
  selectBookingCheckIn,
  selectBookingCheckOut,
  selectBookingGuestDetails,
  selectBookingGuests,
  selectBookingIdempotencyKey,
  selectBookingRoomId,
  selectBookingStep,
  setBookingDates,
  setBookingGuests,
  setBookingRoom,
  setBookingStep,
  setGuestDetails,
  setIdempotencyKey,
} from "./bookingDraftSlice";

describe("bookingDraftSlice", () => {
  it("updates draft fields and resets back to initial state", () => {
    let state = bookingDraftReducer(undefined, setBookingRoom(12));
    state = bookingDraftReducer(
      state,
      setBookingDates({ checkIn: "2026-12-20", checkOut: "2026-12-23" }),
    );
    state = bookingDraftReducer(state, setBookingGuests(2));
    state = bookingDraftReducer(
      state,
      setGuestDetails({ fullName: "Sara Khan", email: "sara@example.com" }),
    );
    state = bookingDraftReducer(state, setIdempotencyKey("key-123"));
    state = bookingDraftReducer(state, setBookingStep(2));

    expect(selectBookingRoomId({ bookingDraft: state })).toBe(12);
    expect(selectBookingCheckIn({ bookingDraft: state })).toBe("2026-12-20");
    expect(selectBookingCheckOut({ bookingDraft: state })).toBe("2026-12-23");
    expect(selectBookingGuests({ bookingDraft: state })).toBe(2);
    expect(selectBookingGuestDetails({ bookingDraft: state })).toEqual({
      fullName: "Sara Khan",
      phone: "",
      email: "sara@example.com",
      specialRequests: "",
    });
    expect(selectBookingIdempotencyKey({ bookingDraft: state })).toBe("key-123");
    expect(selectBookingStep({ bookingDraft: state })).toBe(2);

    const resetState = bookingDraftReducer(state, resetBookingDraft());
    expect(selectBookingRoomId({ bookingDraft: resetState })).toBeNull();
    expect(selectBookingCheckIn({ bookingDraft: resetState })).toBeNull();
    expect(selectBookingGuests({ bookingDraft: resetState })).toBe(1);
    expect(selectBookingIdempotencyKey({ bookingDraft: resetState })).toBeNull();
    expect(selectBookingStep({ bookingDraft: resetState })).toBe(0);
  });

  it("clears idempotencyKey when room or dates change and enforces minimum 1 guest", () => {
    let state = bookingDraftReducer(undefined, setBookingRoom(12));
    state = bookingDraftReducer(state, setIdempotencyKey("key-abc"));
    state = bookingDraftReducer(state, setBookingRoom(15));
    expect(selectBookingIdempotencyKey({ bookingDraft: state })).toBeNull();

    state = bookingDraftReducer(state, setIdempotencyKey("key-def"));
    state = bookingDraftReducer(
      state,
      setBookingDates({ checkIn: "2026-12-21", checkOut: "2026-12-22" }),
    );
    expect(selectBookingIdempotencyKey({ bookingDraft: state })).toBeNull();

    state = bookingDraftReducer(state, setBookingGuests(0));
    expect(selectBookingGuests({ bookingDraft: state })).toBe(1);
  });
});
