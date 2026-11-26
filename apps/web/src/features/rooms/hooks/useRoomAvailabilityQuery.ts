import type { AvailabilityQuery } from "@hotel/shared";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { checkRoomAvailability, queryKeys, type RoomAvailability } from "@/lib/api";

export function useRoomAvailabilityQuery(
  roomId: number,
  dates: AvailabilityQuery | null,
): UseQueryResult<RoomAvailability, Error> {
  const queryClient = useQueryClient();
  const isValidRoom = Number.isInteger(roomId) && roomId > 0;
  const queryParams: AvailabilityQuery = dates ?? { checkIn: "", checkOut: "" };

  return useQuery({
    queryKey: queryKeys.rooms.availability(roomId, queryParams),
    queryFn: () => checkRoomAvailability(roomId, queryParams),
    enabled: isValidRoom && dates !== null,
    retry: (failureCount) => {
      const configuredRetry = queryClient.getDefaultOptions().queries?.retry;
      if (configuredRetry === false) {
        return false;
      }
      const maxRetries = typeof configuredRetry === "number" ? configuredRetry : 1;
      return failureCount < maxRetries;
    },
  });
}
