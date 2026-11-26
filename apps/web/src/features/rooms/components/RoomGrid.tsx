"use client";

import type { ReactNode } from "react";
import type { Room } from "@hotel/shared";
import { EmptyState } from "@/components/ui";
import { DEFAULT_ROOMS_LIMIT } from "../hooks/useRoomsQuery";
import { RoomCard } from "./RoomCard";
import { RoomCardSkeleton } from "./RoomCardSkeleton";

export interface RoomGridProps {
  rooms?: readonly Room[];
  isLoading?: boolean;
  skeletonCount?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  className?: string;
}

const GRID_LAYOUT_CLASSES =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 2xl:grid-cols-4";

export function RoomGrid({
  rooms = [],
  isLoading = false,
  skeletonCount = DEFAULT_ROOMS_LIMIT,
  emptyTitle = "No rooms found",
  emptyDescription = "No rooms match your current selection.",
  emptyAction,
  className = "",
}: RoomGridProps) {
  const gridClassName = `${GRID_LAYOUT_CLASSES} ${className}`.trim();

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading rooms" className={gridClassName}>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <RoomCardSkeleton key={`room-card-skeleton-${index + 1}`} />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  return (
    <div className={gridClassName}>
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  );
}
