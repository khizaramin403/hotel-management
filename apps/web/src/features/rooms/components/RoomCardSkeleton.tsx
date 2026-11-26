"use client";

import { Skeleton } from "antd";

export function RoomCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="room-card-skeleton"
      className="overflow-hidden rounded-lg border border-line bg-neutral-0"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        <Skeleton.Node
          active
          className="!block !h-full !w-full"
          style={{ width: "100%", height: "100%", borderRadius: 0 }}
        />
      </div>

      <div className="p-4">
        <Skeleton
          active
          title={{ width: "68%" }}
          paragraph={{ rows: 2, width: ["52%", "44%"] }}
        />
      </div>
    </div>
  );
}
