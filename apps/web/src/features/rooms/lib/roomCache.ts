import type { RoomDetail, RoomsQuery } from "@hotel/shared";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys, type RoomsListResult } from "@/lib/api";

function matchesInactiveQuery(
  keyParams: Partial<RoomsQuery> | undefined,
  room: { number: string; type: RoomDetail["type"] },
): boolean {
  if (keyParams?.type !== undefined && room.type !== keyParams.type) {
    return false;
  }
  if (keyParams?.q !== undefined) {
    const needle = keyParams.q.trim().toLowerCase();
    if (needle.length > 0 && !room.number.toLowerCase().includes(needle)) {
      return false;
    }
  }
  return true;
}

export function deactivateRoomInCache(queryClient: QueryClient, roomId: number): void {
  let deactivatedSummary: RoomsListResult["data"][number] | null = null;

  queryClient.setQueryData<RoomDetail | undefined>(queryKeys.rooms.detail(roomId), (prev) => {
    if (!prev) {
      return prev;
    }
    deactivatedSummary = {
      id: prev.id,
      number: prev.number,
      type: prev.type,
      pricePerNight: prev.pricePerNight,
      capacity: prev.capacity,
      facilities: prev.facilities,
      description: prev.description,
      isActive: false,
      coverImage: prev.coverImage,
    };
    return { ...prev, isActive: false };
  });

  const listQueries = queryClient.getQueryCache().findAll({
    queryKey: queryKeys.rooms.lists(),
  });

  for (const query of listQueries) {
    const keyParams = query.queryKey[2] as Partial<RoomsQuery> | undefined;
    const includeInactive = keyParams?.includeInactive === true;

    queryClient.setQueryData<RoomsListResult | undefined>(query.queryKey, (previous) => {
      if (!previous) {
        return previous;
      }

      const existingRoom = previous.data.find((item) => item.id === roomId);
      if (existingRoom && !deactivatedSummary) {
        deactivatedSummary = { ...existingRoom, isActive: false };
      }

      const shouldKeepInList =
        includeInactive && (keyParams?.isActive === undefined || keyParams.isActive === false);

      if (shouldKeepInList) {
        if (existingRoom) {
          return {
            ...previous,
            data: previous.data.map((item) =>
              item.id === roomId ? { ...item, isActive: false } : item,
            ),
          };
        }

        if (
          keyParams?.isActive === false &&
          deactivatedSummary &&
          matchesInactiveQuery(keyParams, deactivatedSummary)
        ) {
          const page = keyParams.page ?? 1;
          const limit = previous.meta.limit;
          const nextTotal = previous.meta.total + 1;
          return {
            data: page === 1 ? [deactivatedSummary, ...previous.data].slice(0, limit) : previous.data,
            meta: {
              ...previous.meta,
              total: nextTotal,
              totalPages: Math.max(1, Math.ceil(nextTotal / limit)),
            },
          };
        }

        return previous;
      }

      if (!existingRoom) {
        return previous;
      }

      const nextData = previous.data.filter((item) => item.id !== roomId);
      const nextTotal = Math.max(0, previous.meta.total - 1);
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
