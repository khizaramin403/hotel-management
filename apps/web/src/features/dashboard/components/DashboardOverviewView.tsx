"use client";

import { formatPrice } from "@/lib/format";
import {
  useCheckInsTodayQuery,
  useOccupancyReportQuery,
  useRecentBookingsQuery,
  useSalesReportQuery,
} from "../hooks/useDashboardQueries";
import {
  formatOccupancyRate,
  formatStatCount,
  getLast30DaysRange,
} from "../lib/dashboardFormat";
import { DashboardStatCard } from "./DashboardStatCard";
import { RecentBookingsCard } from "./RecentBookingsCard";
import { SalesChartCard } from "./SalesChartCard";

export function DashboardOverviewView() {
  const { from, to, today } = getLast30DaysRange();

  const salesQuery = useSalesReportQuery({ from, to });
  const occupancyQuery = useOccupancyReportQuery({ from, to });
  const checkInsQuery = useCheckInsTodayQuery(today);
  const recentBookingsQuery = useRecentBookingsQuery();

  const isSalesLoading = salesQuery.isPending || (salesQuery.isFetching && !salesQuery.data);
  const isOccupancyLoading =
    occupancyQuery.isPending || (occupancyQuery.isFetching && !occupancyQuery.data);
  const isCheckInsLoading =
    checkInsQuery.isPending || (checkInsQuery.isFetching && !checkInsQuery.data);
  const isRecentBookingsLoading =
    recentBookingsQuery.isPending ||
    (recentBookingsQuery.isFetching && !recentBookingsQuery.data);

  return (
    <section aria-label="Dashboard overview" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
        <DashboardStatCard
          label="Revenue"
          value={salesQuery.data ? formatPrice(salesQuery.data.totalRevenue) : undefined}
          isLoading={isSalesLoading}
          isError={salesQuery.isError}
          errorTitle="Could not load revenue"
          onRetry={() => {
            void salesQuery.refetch();
          }}
        />
        <DashboardStatCard
          label="Bookings"
          value={salesQuery.data ? formatStatCount(salesQuery.data.bookingCount) : undefined}
          isLoading={isSalesLoading}
          isError={salesQuery.isError}
          errorTitle="Could not load bookings"
          onRetry={() => {
            void salesQuery.refetch();
          }}
        />
        <DashboardStatCard
          label="Occupancy"
          value={
            occupancyQuery.data ? formatOccupancyRate(occupancyQuery.data.occupancyRate) : undefined
          }
          isLoading={isOccupancyLoading}
          isError={occupancyQuery.isError}
          errorTitle="Could not load occupancy"
          onRetry={() => {
            void occupancyQuery.refetch();
          }}
        />
        <DashboardStatCard
          label="Check-ins today"
          value={checkInsQuery.data ? formatStatCount(checkInsQuery.data.meta.total) : undefined}
          isLoading={isCheckInsLoading}
          isError={checkInsQuery.isError}
          errorTitle="Could not load check-ins"
          onRetry={() => {
            void checkInsQuery.refetch();
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-12 xl:items-start">
        <div className="min-w-0 xl:col-span-6 2xl:col-span-7">
          <SalesChartCard
            daily={salesQuery.data?.daily ?? []}
            isLoading={isSalesLoading}
            isError={salesQuery.isError}
            onRetry={() => {
              void salesQuery.refetch();
            }}
          />
        </div>

        <div className="min-w-0 xl:col-span-6 2xl:col-span-5">
          <RecentBookingsCard
            bookings={recentBookingsQuery.data?.data ?? []}
            isLoading={isRecentBookingsLoading}
            isError={recentBookingsQuery.isError}
            onRetry={() => {
              void recentBookingsQuery.refetch();
            }}
          />
        </div>
      </div>
    </section>
  );
}
