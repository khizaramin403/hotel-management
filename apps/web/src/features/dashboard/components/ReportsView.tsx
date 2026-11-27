"use client";

import { useCallback, useMemo, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Skeleton, Statistic } from "antd";
import type { TableColumnsType } from "antd";
import { PageHeader } from "@/components/ui";
import type { OccupancyReport, SalesReport } from "@/lib/api";
import { DateRangePicker, formatCalendarDate, parseCalendarDate } from "@/lib/datePicker";
import { formatDate, formatDateRange, formatPrice } from "@/lib/format";
import { useOccupancyReportQuery, useSalesReportQuery } from "../hooks/useDashboardQueries";
import { formatOccupancyRate, formatStatCount } from "../lib/dashboardFormat";
import {
  buildUpdatedReportsUrl,
  getReportPresets,
  parseReportsSearchParams,
} from "../lib/reportsParams";
import type { OccupancyDailyPoint } from "./OccupancyChart";
import { ReportSectionCard } from "./ReportSectionCard";
import type { SalesDailyPoint } from "./SalesBarChart";
import { SalesChartSkeleton } from "./SalesChartSkeleton";

const DynamicSalesBarChart = dynamic(
  () => import("./SalesBarChart").then((mod) => mod.SalesBarChart),
  {
    ssr: false,
    loading: () => <SalesChartSkeleton label="Loading sales chart" />,
  },
);

const DynamicOccupancyChart = dynamic(
  () => import("./OccupancyChart").then((mod) => mod.OccupancyChart),
  {
    ssr: false,
    loading: () => <SalesChartSkeleton label="Loading occupancy chart" />,
  },
);

type DateRangePickerProps = ComponentProps<typeof DateRangePicker>;

const SALES_COLUMNS: TableColumnsType<SalesDailyPoint> = [
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
    render: (date: string) => (
      <span className="whitespace-nowrap font-sans text-[14px] leading-[22px] text-ink">
        {formatDate(date)}
      </span>
    ),
  },
  {
    title: "Revenue",
    dataIndex: "revenue",
    key: "revenue",
    align: "right",
    render: (revenue: number) => (
      <span className="whitespace-nowrap font-sans text-[14px] font-medium leading-[22px] tabular text-ink">
        {formatPrice(revenue)}
      </span>
    ),
  },
  {
    title: "Bookings",
    dataIndex: "bookings",
    key: "bookings",
    align: "right",
    render: (bookings: number) => (
      <span className="whitespace-nowrap font-sans text-[14px] leading-[22px] tabular text-ink">
        {formatStatCount(bookings)}
      </span>
    ),
  },
];

const OCCUPANCY_COLUMNS: TableColumnsType<OccupancyDailyPoint> = [
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
    render: (date: string) => (
      <span className="whitespace-nowrap font-sans text-[14px] leading-[22px] text-ink">
        {formatDate(date)}
      </span>
    ),
  },
  {
    title: "Occupied rooms",
    dataIndex: "occupiedRooms",
    key: "occupiedRooms",
    align: "right",
    render: (occupiedRooms: number) => (
      <span className="whitespace-nowrap font-sans text-[14px] leading-[22px] tabular text-ink">
        {formatStatCount(occupiedRooms)}
      </span>
    ),
  },
  {
    title: "Rate",
    dataIndex: "rate",
    key: "rate",
    align: "right",
    render: (rate: number) => (
      <span className="whitespace-nowrap font-sans text-[14px] font-medium leading-[22px] tabular text-ink">
        {formatOccupancyRate(rate)}
      </span>
    ),
  },
];

function isSalesReportEmpty(report: SalesReport | undefined): boolean {
  if (!report || report.daily.length === 0) {
    return true;
  }
  return (
    report.bookingCount === 0 &&
    report.totalRevenue === 0 &&
    report.daily.every((point) => point.bookings === 0 && point.revenue === 0)
  );
}

function isOccupancyReportEmpty(report: OccupancyReport | undefined): boolean {
  if (!report || report.daily.length === 0) {
    return true;
  }
  return (
    report.roomNights === 0 &&
    report.occupancyRate === 0 &&
    report.daily.every((point) => point.occupiedRooms === 0 && point.rate === 0)
  );
}

function renderReportStatisticValue(formattedValue: string) {
  return (
    <span className="font-serif text-[24px] font-medium leading-[32px] tabular text-ink">
      {formattedValue}
    </span>
  );
}

export function ReportsSkeleton() {
  return (
    <section className="space-y-6">
      <PageHeader title="Reports" variant="h3" />
      <Card className="rounded-lg border-line bg-neutral-0" styles={{ body: { padding: 16 } }}>
        <Skeleton.Input active className="!h-10 !w-[280px]" />
      </Card>
      <Card className="rounded-lg border-line bg-neutral-0" styles={{ body: { padding: 24 } }}>
        <SalesChartSkeleton label="Loading sales report" />
      </Card>
      <Card className="rounded-lg border-line bg-neutral-0" styles={{ body: { padding: 24 } }}>
        <SalesChartSkeleton label="Loading occupancy report" />
      </Card>
    </section>
  );
}

export function ReportsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { from, to } = parseReportsSearchParams(searchParams);
  const rangeKey = `${from}:${to}`;
  const periodLabel = formatDateRange(from, to);

  const salesQuery = useSalesReportQuery({ from, to });
  const occupancyQuery = useOccupancyReportQuery({ from, to });

  const isSalesLoading = salesQuery.isPending || (salesQuery.isFetching && !salesQuery.data);
  const isOccupancyLoading =
    occupancyQuery.isPending || (occupancyQuery.isFetching && !occupancyQuery.data);

  const presets = useMemo(() => getReportPresets(), []);

  const pickerPresets = useMemo<NonNullable<DateRangePickerProps["presets"]>>(() => {
    return presets.map((preset) => ({
      label: preset.label,
      value: () => {
        const currentPresets = getReportPresets();
        const fresh = currentPresets.find((item) => item.key === preset.key) ?? preset;
        return [
          parseCalendarDate(fresh.from) ?? new Date(),
          parseCalendarDate(fresh.to) ?? new Date(),
        ];
      },
    }));
  }, [presets]);

  const pickerValue = useMemo<[Date, Date] | null>(() => {
    const start = parseCalendarDate(from);
    const end = parseCalendarDate(to);
    return start && end ? [start, end] : null;
  }, [from, to]);

  const handleRangeChange = useCallback(
    (dates: [Date | null, Date | null] | null) => {
      const start = dates?.[0] ?? null;
      const end = dates?.[1] ?? null;
      if (!start || !end) {
        return;
      }

      const nextFrom = formatCalendarDate(start);
      const nextTo = formatCalendarDate(end);
      const nextRange =
        nextTo >= nextFrom ? { from: nextFrom, to: nextTo } : { from: nextTo, to: nextFrom };

      if (nextRange.from === from && nextRange.to === to) {
        return;
      }

      router.push(buildUpdatedReportsUrl(searchParams, nextRange), { scroll: false });
    },
    [from, router, searchParams, to],
  );

  const salesData = salesQuery.data;
  const occupancyData = occupancyQuery.data;

  return (
    <section aria-label="Reports" className="space-y-6">
      <PageHeader title="Reports" variant="h3" />

      <div className="rounded-lg border border-line bg-neutral-0 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:w-[290px]">
            <label
              htmlFor="reports-date-range"
              className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
            >
              Date range
            </label>
            <DateRangePicker
              id="reports-date-range"
              className="w-full"
              format="YYYY-MM-DD"
              allowClear={false}
              value={pickerValue}
              presets={pickerPresets}
              onChange={handleRangeChange}
            />
          </div>

          <span className="font-sans text-[13px] leading-[20px] text-muted">{periodLabel}</span>
        </div>
      </div>

      <ReportSectionCard<SalesDailyPoint>
        title="Sales"
        periodLabel={periodLabel}
        rangeKey={rangeKey}
        sectionTestId="sales-report-section"
        tableTestId="sales-report-table"
        loadingLabel="Loading sales report"
        chartLoadingLabel="Loading sales chart"
        errorTitle="Could not load sales report"
        isLoading={isSalesLoading}
        isError={salesQuery.isError}
        isEmpty={isSalesReportEmpty(salesData)}
        onRetry={() => {
          void salesQuery.refetch();
        }}
        stats={
          salesData ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-line bg-neutral-0 p-4">
                <Statistic
                  title="Total revenue"
                  value={salesData.totalRevenue}
                  formatter={(value) => renderReportStatisticValue(formatPrice(Number(value)))}
                />
              </div>
              <div className="rounded-md border border-line bg-neutral-0 p-4">
                <Statistic
                  title="Bookings"
                  value={salesData.bookingCount}
                  formatter={(value) =>
                    renderReportStatisticValue(formatStatCount(Number(value)))
                  }
                />
              </div>
            </div>
          ) : null
        }
        chart={salesData ? <DynamicSalesBarChart daily={salesData.daily} /> : null}
        tableColumns={SALES_COLUMNS}
        tableRows={salesData?.daily ?? []}
      />

      <ReportSectionCard<OccupancyDailyPoint>
        title="Occupancy"
        periodLabel={periodLabel}
        rangeKey={rangeKey}
        sectionTestId="occupancy-report-section"
        tableTestId="occupancy-report-table"
        loadingLabel="Loading occupancy report"
        chartLoadingLabel="Loading occupancy chart"
        errorTitle="Could not load occupancy report"
        isLoading={isOccupancyLoading}
        isError={occupancyQuery.isError}
        isEmpty={isOccupancyReportEmpty(occupancyData)}
        onRetry={() => {
          void occupancyQuery.refetch();
        }}
        stats={
          occupancyData ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-line bg-neutral-0 p-4">
                <Statistic
                  title="Occupancy rate"
                  value={occupancyData.occupancyRate}
                  formatter={(value) =>
                    renderReportStatisticValue(formatOccupancyRate(Number(value)))
                  }
                />
                <div className="mt-1 font-sans text-[12px] leading-[18px] text-muted tabular">
                  {formatStatCount(occupancyData.roomNights)} of{" "}
                  {formatStatCount(occupancyData.availableRoomNights)} room nights
                </div>
              </div>
            </div>
          ) : null
        }
        chart={occupancyData ? <DynamicOccupancyChart daily={occupancyData.daily} /> : null}
        tableColumns={OCCUPANCY_COLUMNS}
        tableRows={occupancyData?.daily ?? []}
      />
    </section>
  );
}
