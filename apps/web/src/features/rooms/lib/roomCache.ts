import type { Image, Room, RoomDetail, RoomsQuery } from "@hotel/shared";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys, type RoomsListResult } from "@/lib/api";

function toRoomSummary(detail: RoomDetail): Room {
  return {
    id: detail.id,
    number: detail.number,
    type: detail.type,
    pricePerNight: detail.pricePerNight,
    capacity: detail.capacity,
    facilities: [...detail.facilities],
    description: detail.description,
    isActive: detail.isActive,
    coverImage: detail.coverImage,
  };
}

function matchesRoomQuery(keyParams: Partial<RoomsQuery> | undefined, room: Room): boolean {
  const includeInactive = keyParams?.includeInactive === true;

  if (!includeInactive && !room.isActive) {
    return false;
  }
  if (includeInactive && keyParams?.isActive !== undefined && room.isActive !== keyParams.isActive) {
    return false;
  }
  if (keyParams?.type !== undefined && room.type !== keyParams.type) {
    return false;
  }
  if (keyParams?.minPrice !== undefined && room.pricePerNight < keyParams.minPrice) {
    return false;
  }
  if (keyParams?.maxPrice !== undefined && room.pricePerNight > keyParams.maxPrice) {
    return false;
  }
  if (keyParams?.guests !== undefined && room.capacity < keyParams.guests) {
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

function sortRoomsIfRequested(
  rooms: readonly Room[],
  sort: RoomsQuery["sort"] | undefined,
): Room[] {
  const copy = [...rooms];
  if (sort === "price_asc") {
    copy.sort((a, b) => a.pricePerNight - b.pricePerNight || a.id - b.id);
  } else if (sort === "price_desc") {
    copy.sort((a, b) => b.pricePerNight - a.pricePerNight || a.id - b.id);
  } else if (sort === "number") {
    copy.sort((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));
  }
  return copy;
}

function removeFromPage(previous: RoomsListResult, roomId: number): RoomsListResult {
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
}

export function deactivateRoomInCache(queryClient: QueryClient, roomId: number): void {
  let deactivatedSummary: Room | null = null;

  queryClient.setQueryData<RoomDetail | undefined>(queryKeys.rooms.detail(roomId), (prev) => {
    if (!prev) {
      return prev;
    }
    const nextDetail: RoomDetail = { ...prev, isActive: false };
    deactivatedSummary = toRoomSummary(nextDetail);
    return nextDetail;
  });

  const listQueries = queryClient.getQueryCache().findAll({
    queryKey: queryKeys.rooms.lists(),
  });

  for (const query of listQueries) {
    const keyParams = query.queryKey[2] as Partial<RoomsQuery> | undefined;

    queryClient.setQueryData<RoomsListResult | undefined>(query.queryKey, (previous) => {
      if (!previous) {
        return previous;
      }

      const existingRoom = previous.data.find((item) => item.id === roomId);
      if (existingRoom && !deactivatedSummary) {
        deactivatedSummary = { ...existingRoom, isActive: false };
      }

      const includeInactive = keyParams?.includeInactive === true;
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
          matchesRoomQuery(keyParams, deactivatedSummary)
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

      return removeFromPage(previous, roomId);
    });
  }
}

export function upsertRoomInCache(
  queryClient: QueryClient,
  savedDetail: RoomDetail,
  isNew: boolean,
): void {
  const summary = toRoomSummary(savedDetail);

  queryClient.setQueryData<RoomDetail>(queryKeys.rooms.detail(savedDetail.id), savedDetail);

  const listQueries = queryClient.getQueryCache().findAll({
    queryKey: queryKeys.rooms.lists(),
  });

  for (const query of listQueries) {
    const keyParams = query.queryKey[2] as Partial<RoomsQuery> | undefined;

    queryClient.setQueryData<RoomsListResult | undefined>(query.queryKey, (previous) => {
      if (!previous) {
        return previous;
      }

      const existingIndex = previous.data.findIndex((item) => item.id === savedDetail.id);
      const matches = matchesRoomQuery(keyParams, summary);

      if (existingIndex !== -1) {
        if (!matches) {
          return removeFromPage(previous, savedDetail.id);
        }

        const updated = previous.data.map((item) =>
          item.id === savedDetail.id ? summary : item,
        );
        return {
          ...previous,
          data: sortRoomsIfRequested(updated, keyParams?.sort),
        };
      }

      if (!matches) {
        return previous;
      }

      // Skip injecting new rooms into date-filtered queries whose availability isn't known locally.
      if (isNew && keyParams?.checkIn && keyParams?.checkOut) {
        return previous;
      }

      const page = keyParams?.page ?? 1;
      const limit = previous.meta.limit;
      const nextTotal = previous.meta.total + 1;
      const shouldInsertHere = page === 1 || (isNew && previous.data.length < limit && page > 1);
      const nextData = shouldInsertHere
        ? sortRoomsIfRequested([summary, ...previous.data], keyParams?.sort).slice(0, limit)
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

function syncRoomSummaryCoverInListCaches(
  queryClient: QueryClient,
  roomId: number,
  coverImage: Image | null,
): void {
  const listQueries = queryClient.getQueryCache().findAll({
    queryKey: queryKeys.rooms.lists(),
  });

  for (const query of listQueries) {
    queryClient.setQueryData<RoomsListResult | undefined>(query.queryKey, (previous) => {
      if (!previous) {
        return previous;
      }
      const hasRoom = previous.data.some((item) => item.id === roomId);
      if (!hasRoom) {
        return previous;
      }
      return {
        ...previous,
        data: previous.data.map((item) =>
          item.id === roomId
            ? {
                ...item,
                coverImage: coverImage ? { ...coverImage, urls: { ...coverImage.urls } } : null,
              }
            : item,
        ),
      };
    });
  }
}

function withResolvedCover(images: readonly Image[]): {
  images: Image[];
  coverImage: Image | null;
} {
  const normalized = images.map((img, idx) => ({
    ...img,
    sortOrder: idx,
    urls: { ...img.urls },
  }));
  if (normalized.length > 0 && !normalized.some((img) => img.isCover)) {
    normalized[0] = { ...normalized[0]!, isCover: true };
  }
  const coverImage = normalized.find((img) => img.isCover) ?? normalized[0] ?? null;
  return { images: normalized, coverImage };
}

export function addRoomImageInCache(
  queryClient: QueryClient,
  roomId: number,
  addedImage: Image,
  localObjectUrl?: string | null,
): void {
  const nextImage: Image = localObjectUrl
    ? {
        ...addedImage,
        urls: { sm: localObjectUrl, md: localObjectUrl, lg: localObjectUrl },
      }
    : addedImage;

  let resolvedCover: Image | null = nextImage;

  queryClient.setQueryData<RoomDetail | undefined>(queryKeys.rooms.detail(roomId), (prev) => {
    if (!prev) {
      return prev;
    }

    const baseImages = prev.images
      .filter((img) => img.id !== nextImage.id)
      .map((img) => (nextImage.isCover ? { ...img, isCover: false } : img));

    const { images, coverImage } = withResolvedCover([...baseImages, nextImage]);
    resolvedCover = coverImage;
    return {
      ...prev,
      images,
      coverImage,
    };
  });

  const updatedDetail = queryClient.getQueryData<RoomDetail>(queryKeys.rooms.detail(roomId));
  if (updatedDetail) {
    syncRoomSummaryCoverInListCaches(queryClient, roomId, resolvedCover);
  } else if (nextImage.isCover) {
    syncRoomSummaryCoverInListCaches(queryClient, roomId, nextImage);
  }
}

export function setRoomCoverImageInCache(
  queryClient: QueryClient,
  roomId: number,
  updatedCoverImage: Image,
): void {
  let resolvedCover: Image | null = updatedCoverImage;

  queryClient.setQueryData<RoomDetail | undefined>(queryKeys.rooms.detail(roomId), (prev) => {
    if (!prev) {
      return prev;
    }

    const updatedImages = prev.images.map((img) => {
      if (img.id !== updatedCoverImage.id) {
        return { ...img, isCover: false };
      }
      const keepBlobPreview = img.urls.sm.startsWith("blob:");
      return {
        ...updatedCoverImage,
        isCover: true,
        urls: keepBlobPreview ? { ...img.urls } : { ...updatedCoverImage.urls },
      };
    });

    const { images, coverImage } = withResolvedCover(updatedImages);
    resolvedCover = coverImage;
    return {
      ...prev,
      images,
      coverImage,
    };
  });

  syncRoomSummaryCoverInListCaches(queryClient, roomId, resolvedCover);
}

export function removeRoomImageInCache(
  queryClient: QueryClient,
  roomId: number,
  imageId: number,
): void {
  let resolvedCover: Image | null = null;
  let updatedDetail = false;

  queryClient.setQueryData<RoomDetail | undefined>(queryKeys.rooms.detail(roomId), (prev) => {
    if (!prev) {
      return prev;
    }
    updatedDetail = true;
    const remaining = prev.images.filter((img) => img.id !== imageId);
    const { images, coverImage } = withResolvedCover(remaining);
    resolvedCover = coverImage;
    return {
      ...prev,
      images,
      coverImage,
    };
  });

  if (updatedDetail) {
    syncRoomSummaryCoverInListCaches(queryClient, roomId, resolvedCover);
  }
}
