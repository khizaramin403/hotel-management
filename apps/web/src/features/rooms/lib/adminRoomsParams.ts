import { roomTypeSchema, type RoomsQuery, type RoomType } from "@hotel/shared";

export const DEFAULT_ADMIN_ROOMS_PAGE = 1;
export const DEFAULT_ADMIN_ROOMS_LIMIT = 10;
export const ADMIN_ROOMS_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export type AdminRoomsPageSize = (typeof ADMIN_ROOMS_PAGE_SIZE_OPTIONS)[number];
export type AdminRoomStatusFilter = "active" | "inactive";

const ALLOWED_PAGE_SIZES = new Set<number>(ADMIN_ROOMS_PAGE_SIZE_OPTIONS);

export interface ParsedAdminRoomsParams {
  q?: string;
  type?: RoomType;
  status?: AdminRoomStatusFilter;
  page: number;
  limit: AdminRoomsPageSize;
  queryParams: Partial<RoomsQuery>;
}

export interface AdminRoomsUrlPatch {
  q?: string | null;
  type?: RoomType | null;
  status?: AdminRoomStatusFilter | null;
  page?: number | null;
  limit?: AdminRoomsPageSize | null;
  resetPage?: boolean;
}

function parsePositivePage(raw: string | null): number {
  if (!raw || !/^\d+$/.test(raw.trim())) {
    return DEFAULT_ADMIN_ROOMS_PAGE;
  }
  const parsed = Number(raw.trim());
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : DEFAULT_ADMIN_ROOMS_PAGE;
}

function parsePageSize(raw: string | null): AdminRoomsPageSize {
  if (!raw || !/^\d+$/.test(raw.trim())) {
    return DEFAULT_ADMIN_ROOMS_LIMIT;
  }
  const parsed = Number(raw.trim());
  return ALLOWED_PAGE_SIZES.has(parsed)
    ? (parsed as AdminRoomsPageSize)
    : DEFAULT_ADMIN_ROOMS_LIMIT;
}

function parseRoomType(raw: string | null): RoomType | undefined {
  if (!raw) {
    return undefined;
  }
  const parsed = roomTypeSchema.safeParse(raw.trim());
  return parsed.success ? parsed.data : undefined;
}

function parseStatusFilter(raw: string | null): AdminRoomStatusFilter | undefined {
  if (raw === "active" || raw === "inactive") {
    return raw;
  }
  return undefined;
}

export function parseAdminRoomsSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): ParsedAdminRoomsParams {
  const rawQ = searchParams.get("q")?.trim();
  const q = rawQ && rawQ.length > 0 ? rawQ.slice(0, 50) : undefined;
  const type = parseRoomType(searchParams.get("type"));
  const status = parseStatusFilter(searchParams.get("status"));
  const page = parsePositivePage(searchParams.get("page"));
  const limit = parsePageSize(searchParams.get("limit"));

  const queryParams: Partial<RoomsQuery> = {
    ...(q ? { q } : {}),
    ...(type ? { type } : {}),
    includeInactive: true,
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
    page,
    limit,
  };

  return {
    ...(q ? { q } : {}),
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    page,
    limit,
    queryParams,
  };
}

export function buildUpdatedAdminRoomsUrl(
  currentSearchParams: Pick<URLSearchParams, "toString">,
  patch: AdminRoomsUrlPatch,
): string {
  const nextParams = new URLSearchParams(currentSearchParams.toString());

  if (patch.q !== undefined) {
    const trimmed = patch.q?.trim() ?? "";
    if (!trimmed) {
      nextParams.delete("q");
    } else {
      nextParams.set("q", trimmed.slice(0, 50));
    }
  }

  if (patch.type !== undefined) {
    if (patch.type === null) {
      nextParams.delete("type");
    } else {
      nextParams.set("type", patch.type);
    }
  }

  if (patch.status !== undefined) {
    if (patch.status === null) {
      nextParams.delete("status");
    } else {
      nextParams.set("status", patch.status);
    }
  }

  if (patch.limit !== undefined) {
    if (patch.limit === null || patch.limit === DEFAULT_ADMIN_ROOMS_LIMIT) {
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
  return queryString ? `/dashboard/rooms?${queryString}` : "/dashboard/rooms";
}
