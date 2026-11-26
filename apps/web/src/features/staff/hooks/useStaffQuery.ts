"use client";

import type { StaffQuery, User } from "@hotel/shared";
import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { listStaff, queryKeys, type PaginatedResult } from "@/lib/api";
import { DEFAULT_STAFF_LIMIT, DEFAULT_STAFF_PAGE } from "../lib/staffParams";

export function useStaffQuery(
  params?: Partial<StaffQuery>,
): UseQueryResult<PaginatedResult<User>, Error> {
  const normalized: Partial<StaffQuery> = {
    page: params?.page ?? DEFAULT_STAFF_PAGE,
    limit: params?.limit ?? DEFAULT_STAFF_LIMIT,
  };

  return useQuery({
    queryKey: queryKeys.staff.list(normalized),
    queryFn: () => listStaff(normalized),
    placeholderData: keepPreviousData,
  });
}
