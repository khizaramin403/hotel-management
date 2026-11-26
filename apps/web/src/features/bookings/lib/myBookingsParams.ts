import type { BookingStatus } from "@hotel/shared";

export type MyBookingsTab = "upcoming" | "past" | "cancelled";

export const DEFAULT_MY_BOOKINGS_PAGE = 1;
export const DEFAULT_MY_BOOKINGS_LIMIT = 10;

export const MY_BOOKINGS_TAB_STATUSES: Record<MyBookingsTab, readonly BookingStatus[]> = {
  upcoming: ["pending", "confirmed", "checked_in"],
  past: ["checked_out"],
  cancelled: ["cancelled"],
};

export interface ParsedMyBookingsParams {
  tab: MyBookingsTab;
  statuses: readonly BookingStatus[];
  page: number;
  limit: number;
}

function parsePositivePage(raw: string | null): number {
  if (!raw || !/^\d+$/.test(raw.trim())) {
    return DEFAULT_MY_BOOKINGS_PAGE;
  }
  const parsed = Number(raw.trim());
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : DEFAULT_MY_BOOKINGS_PAGE;
}

export function resolveTabFromStatusParam(rawStatus: string | null): MyBookingsTab {
  if (!rawStatus) {
    return "upcoming";
  }

  const tokens = rawStatus
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (tokens.length === 1 && tokens[0] === "checked_out") {
    return "past";
  }
  if (tokens.length === 1 && tokens[0] === "cancelled") {
    return "cancelled";
  }
  return "upcoming";
}

export function parseMyBookingsSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): ParsedMyBookingsParams {
  const tab = resolveTabFromStatusParam(searchParams.get("status"));
  const page = parsePositivePage(searchParams.get("page"));

  return {
    tab,
    statuses: MY_BOOKINGS_TAB_STATUSES[tab],
    page,
    limit: DEFAULT_MY_BOOKINGS_LIMIT,
  };
}

export function buildMyBookingsUrl(tab: MyBookingsTab, page: number = DEFAULT_MY_BOOKINGS_PAGE): string {
  const params = new URLSearchParams();
  params.set("status", MY_BOOKINGS_TAB_STATUSES[tab].join(","));
  params.set("page", String(Math.max(1, page)));
  return `/my-bookings?${params.toString()}`;
}
