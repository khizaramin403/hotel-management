import {
  BOOKING_STATUSES,
  bookingStatusSchema,
  isValidCalendarDate,
  type BookingStatus,
} from "@hotel/shared";

export const DEFAULT_STAFF_BOOKINGS_PAGE = 1;
export const DEFAULT_STAFF_BOOKINGS_LIMIT = 10;
export const STAFF_BOOKINGS_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export type StaffBookingsPageSize = (typeof STAFF_BOOKINGS_PAGE_SIZE_OPTIONS)[number];

const ALLOWED_PAGE_SIZES = new Set<number>(STAFF_BOOKINGS_PAGE_SIZE_OPTIONS);

export interface ParsedStaffBookingsParams {
  statuses: BookingStatus[];
  from?: string;
  to?: string;
  q?: string;
  page: number;
  limit: StaffBookingsPageSize;
}

export interface StaffBookingsUrlPatch {
  statuses?: readonly BookingStatus[] | null;
  from?: string | null;
  to?: string | null;
  q?: string | null;
  page?: number | null;
  limit?: StaffBookingsPageSize | null;
  resetPage?: boolean;
}

function parsePositivePage(raw: string | null): number {
  if (!raw || !/^\d+$/.test(raw.trim())) {
    return DEFAULT_STAFF_BOOKINGS_PAGE;
  }
  const parsed = Number(raw.trim());
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : DEFAULT_STAFF_BOOKINGS_PAGE;
}

function parsePageSize(raw: string | null): StaffBookingsPageSize {
  if (!raw || !/^\d+$/.test(raw.trim())) {
    return DEFAULT_STAFF_BOOKINGS_LIMIT;
  }
  const parsed = Number(raw.trim());
  return ALLOWED_PAGE_SIZES.has(parsed)
    ? (parsed as StaffBookingsPageSize)
    : DEFAULT_STAFF_BOOKINGS_LIMIT;
}

function parseStatusList(raw: string | null): BookingStatus[] {
  if (!raw) {
    return [];
  }

  const seen = new Set<BookingStatus>();
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const parsed = bookingStatusSchema.safeParse(trimmed);
    if (parsed.success && !seen.has(parsed.data)) {
      seen.add(parsed.data);
    }
  }

  return BOOKING_STATUSES.filter((status) => seen.has(status));
}

function parseDateRange(
  rawFrom: string | null,
  rawTo: string | null,
): { from?: string; to?: string } {
  const from = rawFrom && isValidCalendarDate(rawFrom.trim()) ? rawFrom.trim() : undefined;
  const to = rawTo && isValidCalendarDate(rawTo.trim()) ? rawTo.trim() : undefined;

  if (from && to && to < from) {
    return {};
  }

  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}

export function parseStaffBookingsSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): ParsedStaffBookingsParams {
  const statuses = parseStatusList(searchParams.get("status"));
  const { from, to } = parseDateRange(searchParams.get("from"), searchParams.get("to"));
  const rawQ = searchParams.get("q")?.trim();
  const q = rawQ && rawQ.length > 0 ? rawQ.slice(0, 100) : undefined;
  const page = parsePositivePage(searchParams.get("page"));
  const limit = parsePageSize(searchParams.get("limit"));

  return {
    statuses,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(q ? { q } : {}),
    page,
    limit,
  };
}

export function buildUpdatedStaffBookingsUrl(
  currentSearchParams: Pick<URLSearchParams, "toString">,
  patch: StaffBookingsUrlPatch,
): string {
  const nextParams = new URLSearchParams(currentSearchParams.toString());

  if (patch.statuses !== undefined) {
    if (patch.statuses === null || patch.statuses.length === 0) {
      nextParams.delete("status");
    } else {
      nextParams.set("status", patch.statuses.join(","));
    }
  }

  if (patch.from !== undefined) {
    if (patch.from === null || patch.from === "") {
      nextParams.delete("from");
    } else {
      nextParams.set("from", patch.from);
    }
  }

  if (patch.to !== undefined) {
    if (patch.to === null || patch.to === "") {
      nextParams.delete("to");
    } else {
      nextParams.set("to", patch.to);
    }
  }

  if (patch.q !== undefined) {
    const trimmedQ = patch.q?.trim() ?? "";
    if (!trimmedQ) {
      nextParams.delete("q");
    } else {
      nextParams.set("q", trimmedQ.slice(0, 100));
    }
  }

  if (patch.limit !== undefined) {
    if (patch.limit === null || patch.limit === DEFAULT_STAFF_BOOKINGS_LIMIT) {
      nextParams.delete("limit");
    } else {
      nextParams.set("limit", String(patch.limit));
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
  return queryString ? `/dashboard/bookings?${queryString}` : "/dashboard/bookings";
}
