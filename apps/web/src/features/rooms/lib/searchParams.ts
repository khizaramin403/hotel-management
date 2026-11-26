import {
  isValidCalendarDate,
  MAX_STAY_NIGHTS,
  nightsBetween,
  roomTypeSchema,
  type RoomsQuery,
  type RoomType,
} from "@hotel/shared";
import { DEFAULT_ROOMS_LIMIT, DEFAULT_ROOMS_PAGE } from "../hooks/useRoomsQuery";

export const MIN_SEARCH_GUESTS = 1;
export const MAX_SEARCH_GUESTS = 6;
export const DEFAULT_SEARCH_GUESTS = 1;
const MAX_QUERY_GUESTS = 8;

export type RoomSortOption = NonNullable<RoomsQuery["sort"]>;
export type PricePresetId = "under_10000" | "10000_to_20000" | "over_20000";

export interface PriceFilterPreset {
  id: PricePresetId;
  label: string;
  minPrice?: number;
  maxPrice?: number;
}

export const PRICE_FILTER_PRESETS: readonly PriceFilterPreset[] = [
  { id: "under_10000", label: "Under 10,000", maxPrice: 9999 },
  { id: "10000_to_20000", label: "10,000 to 20,000", minPrice: 10000, maxPrice: 20000 },
  { id: "over_20000", label: "Over 20,000", minPrice: 20001 },
];

export const ROOM_SORT_OPTIONS: readonly { value: RoomSortOption | ""; label: string }[] = [
  { value: "", label: "Default order" },
  { value: "price_asc", label: "Price low to high" },
  { value: "price_desc", label: "Price high to low" },
  { value: "number", label: "Room number" },
];

export interface HeroSearchValues {
  checkIn?: string;
  checkOut?: string;
  guests: number;
  type?: RoomType;
}

const VALID_SORT_VALUES = new Set<RoomSortOption>(["price_asc", "price_desc", "number"]);
const PRESERVED_NON_HERO_KEYS = new Set(["minPrice", "maxPrice", "sort"]);

function parsePositiveInt(raw: string | null): number | undefined {
  if (raw === null || !/^\d+$/.test(raw.trim())) {
    return undefined;
  }
  const value = Number(raw.trim());
  return Number.isSafeInteger(value) ? value : undefined;
}

function parseStayDates(
  rawCheckIn: string | null,
  rawCheckOut: string | null,
): { checkIn: string; checkOut: string } | undefined {
  if (!rawCheckIn || !rawCheckOut) {
    return undefined;
  }
  if (!isValidCalendarDate(rawCheckIn) || !isValidCalendarDate(rawCheckOut)) {
    return undefined;
  }
  const nights = nightsBetween(rawCheckIn, rawCheckOut);
  if (nights <= 0 || nights > MAX_STAY_NIGHTS) {
    return undefined;
  }
  return { checkIn: rawCheckIn, checkOut: rawCheckOut };
}

function parseRoomType(rawType: string | null): RoomType | undefined {
  if (!rawType) {
    return undefined;
  }
  const parsed = roomTypeSchema.safeParse(rawType);
  return parsed.success ? parsed.data : undefined;
}

function parseRoomSort(rawSort: string | null): RoomSortOption | undefined {
  if (!rawSort) {
    return undefined;
  }
  return VALID_SORT_VALUES.has(rawSort as RoomSortOption)
    ? (rawSort as RoomSortOption)
    : undefined;
}

/** Parses hero search parameters (checkIn, checkOut, guests, type) safely from URLSearchParams. */
export function parseHeroSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): HeroSearchValues {
  const stayDates = parseStayDates(searchParams.get("checkIn"), searchParams.get("checkOut"));
  const parsedGuests = parsePositiveInt(searchParams.get("guests"));
  const guests =
    parsedGuests !== undefined &&
    parsedGuests >= MIN_SEARCH_GUESTS &&
    parsedGuests <= MAX_SEARCH_GUESTS
      ? parsedGuests
      : DEFAULT_SEARCH_GUESTS;
  const type = parseRoomType(searchParams.get("type"));

  return {
    ...(stayDates ?? {}),
    guests,
    ...(type ? { type } : {}),
  };
}

/** Parses all rooms list query parameters from URLSearchParams for useRoomsQuery. */
export function parseRoomsQueryParams(
  searchParams: Pick<URLSearchParams, "get">,
): Partial<RoomsQuery> {
  const type = parseRoomType(searchParams.get("type"));
  const minPrice = parsePositiveInt(searchParams.get("minPrice"));
  const maxPrice = parsePositiveInt(searchParams.get("maxPrice"));
  const hasValidPriceRange =
    minPrice === undefined || maxPrice === undefined || maxPrice >= minPrice;

  const parsedGuests = parsePositiveInt(searchParams.get("guests"));
  const guests =
    parsedGuests !== undefined && parsedGuests >= 1 && parsedGuests <= MAX_QUERY_GUESTS
      ? parsedGuests
      : undefined;

  const stayDates = parseStayDates(searchParams.get("checkIn"), searchParams.get("checkOut"));
  const sort = parseRoomSort(searchParams.get("sort"));

  const parsedPage = parsePositiveInt(searchParams.get("page"));
  const page = parsedPage !== undefined && parsedPage >= 1 ? parsedPage : DEFAULT_ROOMS_PAGE;

  return {
    ...(type ? { type } : {}),
    ...(minPrice !== undefined && hasValidPriceRange ? { minPrice } : {}),
    ...(maxPrice !== undefined && hasValidPriceRange ? { maxPrice } : {}),
    ...(guests !== undefined ? { guests } : {}),
    ...(stayDates ?? {}),
    ...(sort ? { sort } : {}),
    page,
    limit: DEFAULT_ROOMS_LIMIT,
  };
}

/** Returns the active preset id when URL minPrice/maxPrice match one of the three price chips. */
export function getSelectedPricePresetId(
  minPrice?: number,
  maxPrice?: number,
): PricePresetId | undefined {
  const match = PRICE_FILTER_PRESETS.find(
    (preset) => preset.minPrice === minPrice && preset.maxPrice === maxPrice,
  );
  return match?.id;
}

export interface RoomsUrlPatch {
  type?: RoomType | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  sort?: RoomSortOption | null;
  page?: number | null;
  resetPage?: boolean;
}

/** Applies filter, sort, or page updates to current URLSearchParams and returns the next URL. */
export function buildUpdatedRoomsUrl(
  currentSearchParams: Pick<URLSearchParams, "toString">,
  patch: RoomsUrlPatch,
): string {
  const nextParams = new URLSearchParams(currentSearchParams.toString());

  if (patch.type !== undefined) {
    if (patch.type === null) {
      nextParams.delete("type");
    } else {
      nextParams.set("type", patch.type);
    }
  }

  if (patch.minPrice !== undefined) {
    if (patch.minPrice === null) {
      nextParams.delete("minPrice");
    } else {
      nextParams.set("minPrice", String(patch.minPrice));
    }
  }

  if (patch.maxPrice !== undefined) {
    if (patch.maxPrice === null) {
      nextParams.delete("maxPrice");
    } else {
      nextParams.set("maxPrice", String(patch.maxPrice));
    }
  }

  if (patch.sort !== undefined) {
    if (patch.sort === null) {
      nextParams.delete("sort");
    } else {
      nextParams.set("sort", patch.sort);
    }
  }

  if (patch.resetPage) {
    nextParams.delete("page");
  } else if (patch.page !== undefined) {
    if (patch.page === null || patch.page <= 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", String(patch.page));
    }
  }

  const queryString = nextParams.toString();
  return queryString ? `/?${queryString}` : "/";
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
