import type { StaffQuery, User } from "@hotel/shared";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys, type PaginatedResult } from "@/lib/api";

export function addStaffInCache(queryClient: QueryClient, createdStaff: User): void {
  const listQueries = queryClient.getQueryCache().findAll({
    queryKey: queryKeys.staff.lists(),
  });

  for (const query of listQueries) {
    const keyParams = query.queryKey[2] as Partial<StaffQuery> | undefined;

    queryClient.setQueryData<PaginatedResult<User> | undefined>(query.queryKey, (previous) => {
      if (!previous) {
        return previous;
      }

      if (previous.data.some((member) => member.id === createdStaff.id)) {
        return previous;
      }

      const page = keyParams?.page ?? 1;
      const limit = previous.meta.limit;
      const nextTotal = previous.meta.total + 1;
      const shouldInsertHere = page === 1 || (page > 1 && previous.data.length < limit);
      const nextData = shouldInsertHere
        ? [createdStaff, ...previous.data].slice(0, limit)
        : previous.data;

      return {
        data: nextData,
        meta: {
          ...previous.meta,
          total: nextTotal,
          totalPages: Math.max(1, Math.ceil(nextTotal / limit)),
        },
      };
    });
  }
}

export function removeStaffInCache(queryClient: QueryClient, staffId: number): void {
  const listQueries = queryClient.getQueryCache().findAll({
    queryKey: queryKeys.staff.lists(),
  });

  for (const query of listQueries) {
    queryClient.setQueryData<PaginatedResult<User> | undefined>(query.queryKey, (previous) => {
      if (!previous) {
        return previous;
      }

      const hadMember = previous.data.some((member) => member.id === staffId);
      const nextData = previous.data.filter((member) => member.id !== staffId);
      const nextTotal = hadMember ? Math.max(0, previous.meta.total - 1) : previous.meta.total;
      const limit = previous.meta.limit;

      return {
        data: nextData,
        meta: {
          ...previous.meta,
          total: nextTotal,
          totalPages: nextTotal === 0 ? 0 : Math.ceil(nextTotal / limit),
        },
      };
    });
  }
}
