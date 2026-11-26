"use client";

import { Card, Skeleton, Statistic } from "antd";
import { ErrorState } from "@/components/ui";

export interface DashboardStatCardProps {
  label: string;
  value?: string;
  isLoading: boolean;
  isError: boolean;
  errorTitle?: string;
  onRetry?: () => void;
}

export function DashboardStatCard({
  label,
  value,
  isLoading,
  isError,
  errorTitle = "Could not load metric",
  onRetry,
}: DashboardStatCardProps) {
  return (
    <Card
      className="h-full rounded-lg border-line bg-neutral-0"
      styles={{ body: { padding: 24 } }}
    >
      {isLoading ? (
        <div role="status" aria-busy="true" aria-label={`Loading ${label}`}>
          <div className="mb-2 font-sans text-[13px] font-normal leading-[20px] text-muted">
            {label}
          </div>
          <Skeleton.Input active size="large" className="!h-10 !w-28" />
        </div>
      ) : isError ? (
        <div>
          <div className="mb-2 font-sans text-[13px] font-normal leading-[20px] text-muted">
            {label}
          </div>
          <ErrorState
            variant="alert"
            title={errorTitle}
            onRetry={onRetry}
            className="[&_.ant-alert]:flex-wrap [&_.ant-alert]:gap-2 [&_.ant-alert-action]:ms-0"
          />
        </div>
      ) : (
        <Statistic
          title={
            <span className="font-sans text-[13px] font-normal leading-[20px] text-muted">
              {label}
            </span>
          }
          value={value ?? ""}
          formatter={(val) => (
            <span className="font-serif text-[32px] font-semibold leading-[40px] tabular text-ink">
              {val}
            </span>
          )}
        />
      )}
    </Card>
  );
}
