"use client";

import { useState, type ReactNode } from "react";
import { Card, Skeleton, Table } from "antd";
import type { TableColumnsType } from "antd";
import { EmptyState, ErrorState } from "@/components/ui";
import { SalesChartSkeleton } from "./SalesChartSkeleton";

export const REPORTS_TABLE_PAGE_SIZE = 10;

const SKELETON_STAT_CARDS = [1, 2] as const;
const SKELETON_TABLE_ROWS = [1, 2, 3, 4, 5] as const;

export interface ReportSectionCardProps<Row extends { date: string }> {
  title: string;
  periodLabel: string;
  rangeKey: string;
  sectionTestId: string;
  tableTestId: string;
  loadingLabel: string;
  chartLoadingLabel: string;
  errorTitle: string;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  stats: ReactNode;
  chart: ReactNode;
  tableColumns: TableColumnsType<Row>;
  tableRows: readonly Row[];
}

function ReportBlockSkeleton({
  loadingLabel,
  chartLoadingLabel,
}: {
  loadingLabel: string;
  chartLoadingLabel: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={loadingLabel} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SKELETON_STAT_CARDS.map((card) => (
          <div key={card} className="rounded-md border border-line bg-neutral-0 p-4">
            <Skeleton active title={{ width: "40%" }} paragraph={{ rows: 1, width: "60%" }} />
          </div>
        ))}
      </div>

      <SalesChartSkeleton label={chartLoadingLabel} />

      <div className="rounded-md border border-line bg-neutral-0 p-4">
        <div className="space-y-3">
          {SKELETON_TABLE_ROWS.map((row) => (
            <Skeleton
              key={row}
              active
              title={false}
              paragraph={{ rows: 1, width: "100%" }}
              className="border-b border-line pb-2.5 last:border-b-0 last:pb-0"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PaginatedDailyTable<Row extends { date: string }>({
  tableTestId,
  columns,
  rows,
}: {
  tableTestId: string;
  columns: TableColumnsType<Row>;
  rows: readonly Row[];
}) {
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div
      data-testid={tableTestId}
      className="dashboard-compact-table overflow-hidden rounded-md border border-line bg-neutral-0"
    >
      <Table<Row>
        rowKey="date"
        size="small"
        columns={columns}
        dataSource={[...rows]}
        scroll={{ x: "max-content" }}
        pagination={{
          current: currentPage,
          pageSize: REPORTS_TABLE_PAGE_SIZE,
          total: rows.length,
          showSizeChanger: false,
          hideOnSinglePage: rows.length <= REPORTS_TABLE_PAGE_SIZE,
          position: ["bottomRight"],
          onChange: (page) => setCurrentPage(page),
        }}
      />
    </div>
  );
}

export function ReportSectionCard<Row extends { date: string }>({
  title,
  periodLabel,
  rangeKey,
  sectionTestId,
  tableTestId,
  loadingLabel,
  chartLoadingLabel,
  errorTitle,
  isLoading,
  isError,
  isEmpty,
  onRetry,
  stats,
  chart,
  tableColumns,
  tableRows,
}: ReportSectionCardProps<Row>) {
  return (
    <Card
      data-testid={sectionTestId}
      className="rounded-lg border-line bg-neutral-0"
      styles={{ body: { padding: 24 } }}
    >
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 font-sans text-[18px] font-semibold leading-[26px] text-ink">
          {title}
        </h2>
        <span className="font-sans text-[13px] leading-[20px] text-muted">{periodLabel}</span>
      </div>

      {isLoading ? (
        <ReportBlockSkeleton loadingLabel={loadingLabel} chartLoadingLabel={chartLoadingLabel} />
      ) : isError ? (
        <ErrorState
          variant="alert"
          title={errorTitle}
          description="Check your connection and try again."
          onRetry={onRetry}
        />
      ) : isEmpty ? (
        <EmptyState
          title="No bookings in this period"
          description="Try selecting a different date range."
        />
      ) : (
        <div className="space-y-6">
          {stats}
          {chart}
          <PaginatedDailyTable
            key={rangeKey}
            tableTestId={tableTestId}
            columns={tableColumns}
            rows={tableRows}
          />
        </div>
      )}
    </Card>
  );
}
