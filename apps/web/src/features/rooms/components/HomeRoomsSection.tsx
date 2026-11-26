"use client";

import { ErrorState } from "@/components/ui";
import {
  DEFAULT_ROOMS_LIMIT,
  DEFAULT_ROOMS_PAGE,
  useRoomsQuery,
} from "../hooks/useRoomsQuery";
import { RoomGrid } from "./RoomGrid";

export function HomeRoomsSection() {
  const { data, isPending, isFetching, isError, refetch } = useRoomsQuery({
    page: DEFAULT_ROOMS_PAGE,
    limit: DEFAULT_ROOMS_LIMIT,
  });

  const isInitialLoading = isPending || (isFetching && !data);

  if (isInitialLoading) {
    return <RoomGrid isLoading skeletonCount={DEFAULT_ROOMS_LIMIT} />;
  }

  if (isError) {
    return (
      <ErrorState
        variant="alert"
        title="Could not load rooms"
        description="Check your connection and try again."
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <RoomGrid
      rooms={data?.data ?? []}
      emptyTitle="No rooms available"
      emptyDescription="No rooms are available right now. Check back soon."
    />
  );
}
