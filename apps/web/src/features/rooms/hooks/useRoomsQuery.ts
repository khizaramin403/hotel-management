"use client";

import type { RoomsQuery } from "@hotel/shared";
import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { listRooms, queryKeys, type RoomsListResult } from "@/lib/api";
import { DEFAULT_ROOMS_LIMIT, DEFAULT_ROOMS_PAGE } from "../lib/searchParams";

export { DEFAULT_ROOMS_LIMIT, DEFAULT_ROOMS_PAGE };

export type RoomsQueryParams = Partial<RoomsQuery>;

function normalizeRoomsParams(params: RoomsQueryParams = {}): RoomsQueryParams {
  const normalized: RoomsQueryParams = {
    page: params.page ?? DEFAULT_ROOMS_PAGE,
    limit: params.limit ?? DEFAULT_ROOMS_LIMIT,
  };

  if (params.type !== undefined) normalized.type = params.type;
  if (params.minPrice !== undefined) normalized.minPrice = params.minPrice;
  if (params.maxPrice !== undefined) normalized.maxPrice = params.maxPrice;
  if (params.guests !== undefined) normalized.guests = params.guests;
  if (params.checkIn !== undefined) normalized.checkIn = params.checkIn;
  if (params.checkOut !== undefined) normalized.checkOut = params.checkOut;
  if (params.sort !== undefined) normalized.sort = params.sort;
  if (params.q !== undefined) normalized.q = params.q;
  if (params.includeInactive !== undefined) normalized.includeInactive = params.includeInactive;
  if (params.isActive !== undefined) normalized.isActive = params.isActive;

  return normalized;
}

export function useRoomsQuery(params?: RoomsQueryParams): UseQueryResult<RoomsListResult, Error> {
  const normalizedParams = normalizeRoomsParams(params);

  return useQuery({
    queryKey: queryKeys.rooms.list(normalizedParams),
    queryFn: () => listRooms(normalizedParams),
    placeholderData: keepPreviousData,
  });
}
