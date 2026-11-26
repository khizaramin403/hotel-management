import type { StaffQuery } from "@hotel/shared";

export const DEFAULT_STAFF_PAGE = 1;
export const DEFAULT_STAFF_LIMIT = 10;
export const STAFF_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export type StaffPageSize = (typeof STAFF_PAGE_SIZE_OPTIONS)[number];

const ALLOWED_PAGE_SIZES = new Set<number>(STAFF_PAGE_SIZE_OPTIONS);

export interface ParsedStaffParams {
  page: number;
  limit: StaffPageSize;
  queryParams: Partial<StaffQuery>;
}

export interface StaffUrlPatch {
  page?: number | null;
  limit?: StaffPageSize | null;
}

function parsePositivePage(raw: string | null): number {
  if (!raw || !/^\d+$/.test(raw.trim())) {
    return DEFAULT_STAFF_PAGE;
  }
  const parsed = Number(raw.trim());
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : DEFAULT_STAFF_PAGE;
}

function parsePageSize(raw: string | null): StaffPageSize {
  if (!raw || !/^\d+$/.test(raw.trim())) {
    return DEFAULT_STAFF_LIMIT;
  }
  const parsed = Number(raw.trim());
  return ALLOWED_PAGE_SIZES.has(parsed) ? (parsed as StaffPageSize) : DEFAULT_STAFF_LIMIT;
}

export function parseStaffSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): ParsedStaffParams {
  const page = parsePositivePage(searchParams.get("page"));
  const limit = parsePageSize(searchParams.get("limit"));

  return {
    page,
    limit,
    queryParams: { page, limit },
  };
}

export function buildUpdatedStaffUrl(
  currentSearchParams: Pick<URLSearchParams, "toString">,
  patch: StaffUrlPatch,
): string {
  const nextParams = new URLSearchParams(currentSearchParams.toString());

  if (patch.limit !== undefined) {
    if (patch.limit === null || patch.limit === DEFAULT_STAFF_LIMIT) {
      nextParams.delete("limit");
    } else {
      nextParams.set("limit", String(patch.limit));
    }
  }

  if (patch.page !== undefined) {
    if (patch.page === null || patch.page <= 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", String(patch.page));
    }
  }

  const queryString = nextParams.toString();
  return queryString ? `/dashboard/staff?${queryString}` : "/dashboard/staff";
}
