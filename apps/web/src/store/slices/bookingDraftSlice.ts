import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface BookingGuestDetails {
  fullName: string;
  phone: string;
  email: string;
  specialRequests: string;
}

export type BookingStep = 0 | 1 | 2;

export interface BookingDraftState {
  roomId: number | null;
  checkIn: string | null;
  checkOut: string | null;
  guests: number;
  guestDetails: BookingGuestDetails;
  idempotencyKey: string | null;
  step: BookingStep;
}

const initialState: BookingDraftState = {
  roomId: null,
  checkIn: null,
  checkOut: null,
  guests: 1,
  guestDetails: {
    fullName: "",
    phone: "",
    email: "",
    specialRequests: "",
  },
  idempotencyKey: null,
  step: 0,
};

const bookingDraftSlice = createSlice({
  name: "bookingDraft",
  initialState,
  reducers: {
    setBookingRoom(state, action: PayloadAction<number | null>) {
      if (state.roomId !== action.payload) {
        state.idempotencyKey = null;
      }
      state.roomId = action.payload;
    },
    setBookingDates(
      state,
      action: PayloadAction<{ checkIn: string | null; checkOut: string | null }>,
    ) {
      if (state.checkIn !== action.payload.checkIn || state.checkOut !== action.payload.checkOut) {
        state.idempotencyKey = null;
      }
      state.checkIn = action.payload.checkIn;
      state.checkOut = action.payload.checkOut;
    },
    setBookingGuests(state, action: PayloadAction<number>) {
      state.guests = Math.max(1, action.payload);
    },
    setGuestDetails(state, action: PayloadAction<Partial<BookingGuestDetails>>) {
      state.guestDetails = { ...state.guestDetails, ...action.payload };
    },
    setIdempotencyKey(state, action: PayloadAction<string | null>) {
      state.idempotencyKey = action.payload;
    },
    setBookingStep(state, action: PayloadAction<BookingStep>) {
      state.step = action.payload;
    },
    resetBookingDraft() {
      return initialState;
    },
  },
});

export const {
  setBookingRoom,
  setBookingDates,
  setBookingGuests,
  setGuestDetails,
  setIdempotencyKey,
  setBookingStep,
  resetBookingDraft,
} = bookingDraftSlice.actions;
export const bookingDraftReducer = bookingDraftSlice.reducer;

export const selectBookingRoomId = (state: { bookingDraft: BookingDraftState }) =>
  state.bookingDraft.roomId;
export const selectBookingCheckIn = (state: { bookingDraft: BookingDraftState }) =>
  state.bookingDraft.checkIn;
export const selectBookingCheckOut = (state: { bookingDraft: BookingDraftState }) =>
  state.bookingDraft.checkOut;
export const selectBookingGuests = (state: { bookingDraft: BookingDraftState }) =>
  state.bookingDraft.guests;
export const selectBookingGuestDetails = (state: { bookingDraft: BookingDraftState }) =>
  state.bookingDraft.guestDetails;
export const selectBookingIdempotencyKey = (state: { bookingDraft: BookingDraftState }) =>
  state.bookingDraft.idempotencyKey;
export const selectBookingStep = (state: { bookingDraft: BookingDraftState }) =>
  state.bookingDraft.step;
