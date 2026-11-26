import { isValidCalendarDate } from "@hotel/shared";
import type { AppStore } from "./index";
import {
  hydrateBookingDraft,
  type BookingDraftState,
  type BookingGuestDetails,
  type BookingStep,
} from "./slices/bookingDraftSlice";

export const BOOKING_DRAFT_STORAGE_KEY = "hotel:bookingDraft";

const hydratedStores = new WeakSet<AppStore>();
const storeListenerCounts = new WeakMap<AppStore, number>();

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBookingStep(value: unknown): value is BookingStep {
  return value === 0 || value === 1 || value === 2;
}

function parseGuestDetails(value: unknown): BookingGuestDetails | null {
  if (!isPlainRecord(value)) {
    return null;
  }

  const { fullName, phone, email, specialRequests } = value;
  if (
    typeof fullName !== "string" ||
    typeof phone !== "string" ||
    typeof email !== "string" ||
    typeof specialRequests !== "string"
  ) {
    return null;
  }

  return { fullName, phone, email, specialRequests };
}

function isDraftEmpty(draft: BookingDraftState): boolean {
  return (
    draft.roomId === null &&
    draft.checkIn === null &&
    draft.checkOut === null &&
    draft.guestDetails.fullName === "" &&
    draft.guestDetails.phone === "" &&
    draft.guestDetails.email === "" &&
    draft.guestDetails.specialRequests === ""
  );
}

/** Parses and validates a serialized `BookingDraftState` from `sessionStorage`. */
export function parseBookingDraft(raw: string | null): BookingDraftState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainRecord(parsed)) {
      return null;
    }

    const roomId = parsed.roomId;
    if (
      roomId !== null &&
      (typeof roomId !== "number" || !Number.isInteger(roomId) || roomId <= 0)
    ) {
      return null;
    }

    const checkIn = parsed.checkIn;
    if (checkIn !== null && (typeof checkIn !== "string" || !isValidCalendarDate(checkIn))) {
      return null;
    }

    const checkOut = parsed.checkOut;
    if (checkOut !== null && (typeof checkOut !== "string" || !isValidCalendarDate(checkOut))) {
      return null;
    }

    const guests = parsed.guests;
    if (typeof guests !== "number" || !Number.isInteger(guests) || guests < 1) {
      return null;
    }

    const guestDetails = parseGuestDetails(parsed.guestDetails);
    if (!guestDetails) {
      return null;
    }

    const idempotencyKey = parsed.idempotencyKey;
    if (idempotencyKey !== null && typeof idempotencyKey !== "string") {
      return null;
    }

    if (!isBookingStep(parsed.step)) {
      return null;
    }

    return {
      roomId,
      checkIn,
      checkOut,
      guests,
      guestDetails,
      idempotencyKey,
      step: parsed.step,
    };
  } catch {
    return null;
  }
}

export function readBookingDraftFromStorage(): BookingDraftState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return parseBookingDraft(window.sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeBookingDraftToStorage(draft: BookingDraftState): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (isDraftEmpty(draft)) {
      window.sessionStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore sessionStorage write failures in restricted browser environments.
  }
}

/** Hydrates `bookingDraft` once per store instance if no draft is already loaded in Redux. */
export function ensureBookingDraftHydrated(store: AppStore): boolean {
  if (hydratedStores.has(store)) {
    return true;
  }

  hydratedStores.add(store);

  const currentDraft = store.getState().bookingDraft;
  const hasExistingSelection =
    currentDraft.roomId !== null ||
    currentDraft.checkIn !== null ||
    currentDraft.checkOut !== null;

  if (!hasExistingSelection) {
    const storedDraft = readBookingDraftFromStorage();
    if (storedDraft) {
      store.dispatch(hydrateBookingDraft(storedDraft));
    }
  }

  return true;
}

/** Hydrates `bookingDraft` from `sessionStorage` and persists only `bookingDraft` updates. */
export function attachBookingDraftPersistence(store: AppStore): () => void {
  ensureBookingDraftHydrated(store);

  const activeCount = storeListenerCounts.get(store) ?? 0;
  storeListenerCounts.set(store, activeCount + 1);

  if (activeCount > 0) {
    return () => {
      const remaining = (storeListenerCounts.get(store) ?? 1) - 1;
      if (remaining <= 0) {
        storeListenerCounts.delete(store);
      } else {
        storeListenerCounts.set(store, remaining);
      }
    };
  }

  let previousDraft = store.getState().bookingDraft;

  const unsubscribe = store.subscribe(() => {
    const currentDraft = store.getState().bookingDraft;
    if (currentDraft !== previousDraft) {
      previousDraft = currentDraft;
      writeBookingDraftToStorage(currentDraft);
    }
  });

  return () => {
    const remaining = (storeListenerCounts.get(store) ?? 1) - 1;
    if (remaining <= 0) {
      storeListenerCounts.delete(store);
      unsubscribe();
    } else {
      storeListenerCounts.set(store, remaining);
    }
  };
}
