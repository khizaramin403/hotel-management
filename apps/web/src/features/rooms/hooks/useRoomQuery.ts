"use client";

import type { RoomDetail } from "@hotel/shared";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { ApiClientError, getRoom, queryKeys } from "@/lib/api";

export function useRoomQuery(id: number): UseQueryResult<RoomDetail, Error> {
  const queryClient = useQueryClient();
  const isValidId = Number.isInteger(id) && id > 0;

  return useQuery({
    queryKey: queryKeys.rooms.detail(id),
    queryFn: () => getRoom(id),
    enabled: isValidId,
    retry: (failureCount, error) => {
      const configuredRetry = queryClient.getDefaultOptions().queries?.retry;
      if (configuredRetry === false) {
        return false;
      }
      if (error instanceof ApiClientError && (error.status === 404 || error.code === "NOT_FOUND")) {
        return false;
      }
      const maxRetries = typeof configuredRetry === "number" ? configuredRetry : 1;
      return failureCount < maxRetries;
    },
  });
}
