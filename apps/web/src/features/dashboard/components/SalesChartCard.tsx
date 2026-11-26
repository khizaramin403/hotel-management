"use client";

import dynamic from "next/dynamic";
import { Card } from "antd";
import { EmptyState, ErrorState } from "@/components/ui";
import type { SalesDailyPoint } from "./SalesBarChart";
import { SalesChartSkeleton } from "./SalesChartSkeleton";

const SalesBarChart = dynamic(
  () => import("./SalesBarChart").then((mod) => mod.SalesBarChart),
  {
    ssr: false,
    loading: () => <SalesChartSkeleton />,
  },
);

export interface SalesChartCardProps {
  daily: readonly SalesDailyPoint[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function SalesChartCard({ daily, isLoading, isError, onRetry }: SalesChartCardProps) {
  return (
    <Card
      className="rounded-lg border-line bg-neutral-0"
      styles={{ body: { padding: 24 } }}
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 font-sans text-[18px] font-semibold leading-[26px] text-ink">
          Sales per day
        </h2>
        <span className="font-sans text-[13px] leading-[20px] text-muted">Last 30 days</span>
      </div>

      {isLoading ? (
        <SalesChartSkeleton />
      ) : isError ? (
        <ErrorState
          variant="alert"
          title="Could not load sales chart"
          description="Check your connection and try again."
          onRetry={onRetry}
        />
      ) : daily.length === 0 ? (
        <EmptyState
          title="No sales data yet"
          description="Confirmed bookings from the last 30 days will appear here."
        />
      ) : (
        <SalesBarChart daily={daily} />
      )}
    </Card>
  );
}
