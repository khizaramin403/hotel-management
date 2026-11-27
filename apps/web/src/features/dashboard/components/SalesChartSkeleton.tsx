"use client";

import { Skeleton } from "antd";

const CHART_BAR_HEIGHTS = [42, 68, 54, 82, 60, 92, 74, 58, 86, 66] as const;

export interface SalesChartSkeletonProps {
  label?: string;
}

export function SalesChartSkeleton({ label = "Loading sales chart" }: SalesChartSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="flex h-[280px] flex-col justify-between pt-2"
    >
      <div className="flex flex-1 items-end gap-3 border-b border-line pb-3">
        {CHART_BAR_HEIGHTS.map((heightPercent, index) => (
          <div
            key={index}
            className="flex flex-1 items-end"
            style={{ height: `${heightPercent}%` }}
          >
            <Skeleton.Node
              active
              className="!block !h-full !w-full"
              style={{ width: "100%", height: "100%", borderRadius: 4 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between gap-4">
        <Skeleton.Input active size="small" className="!h-4 !w-14" />
        <Skeleton.Input active size="small" className="!h-4 !w-14" />
        <Skeleton.Input active size="small" className="!h-4 !w-14" />
      </div>
    </div>
  );
}
