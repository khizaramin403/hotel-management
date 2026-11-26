import {
  isValidCalendarDate,
  MAX_STAY_NIGHTS,
  nightsBetween,
  roomTypeSchema,
  type RoomType,
} from "@hotel/shared";

export const MIN_SEARCH_GUESTS = 1;
export const MAX_SEARCH_GUESTS = 6;
export const DEFAULT_SEARCH_GUESTS = 1;

export interface HeroSearchValues {
  checkIn?: string;
  checkOut?: string;
  guests: number;
  type?: RoomType;
}

const PRESERVED_NON_HERO_KEYS = new Set(["minPrice", "maxPrice", "sort"]);

/** Parses hero search parameters (checkIn, checkOut, guests, type) safely from URLSearchParams. */
export function parseHeroSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): HeroSearchValues {
  const rawCheckIn = searchParams.get("checkIn");
  const rawCheckOut = searchParams.get("checkOut");

  let checkIn: string | undefined;
  let checkOut: string | undefined;
  if (rawCheckIn && rawCheckOut && isValidCalendarDate(rawCheckIn) && isValidCalendarDate(rawCheckOut)) {
    const nights = nightsBetween(rawCheckIn, rawCheckOut);
    if (nights > 0 && nights <= MAX_STAY_NIGHTS) {
      checkIn = rawCheckIn;
      checkOut = rawCheckOut;
    }
  }

  const rawGuests = searchParams.get("guests");
  let guests = DEFAULT_SEARCH_GUESTS;
  if (rawGuests !== null && /^\d+$/.test(rawGuests.trim())) {
    const parsedGuests = Number(rawGuests.trim());
    if (parsedGuests >= MIN_SEARCH_GUESTS && parsedGuests <= MAX_SEARCH_GUESTS) {
      guests = parsedGuests;
    }
  }

  const rawType = searchParams.get("type");
  const parsedType = rawType ? roomTypeSchema.safeParse(rawType) : null;
  const type = parsedType?.success ? parsedType.data : undefined;

  return {
    ...(checkIn && checkOut ? { checkIn, checkOut } : {}),
    guests,
    ...(type ? { type } : {}),
  };
}

/** Builds the destination URL when submitting the hero search card. */
export function buildHeroSearchUrl(
  values: HeroSearchValues,
  currentSearchParams?: Pick<URLSearchParams, "entries">,
): string {
  const nextParams = new URLSearchParams();

  if (values.checkIn && values.checkOut) {
    nextParams.set("checkIn", values.checkIn);
    nextParams.set("checkOut", values.checkOut);
  }

  const boundedGuests = Math.min(
    MAX_SEARCH_GUESTS,
    Math.max(MIN_SEARCH_GUESTS, Math.round(values.guests)),
  );
  nextParams.set("guests", String(boundedGuests));

  if (values.type) {
    nextParams.set("type", values.type);
  }

  if (currentSearchParams) {
    for (const [key, value] of currentSearchParams.entries()) {
      if (PRESERVED_NON_HERO_KEYS.has(key) && value) {
        nextParams.set(key, value);
      }
    }
  }

  const queryString = nextParams.toString();
  return queryString ? `/?${queryString}` : "/";
}
