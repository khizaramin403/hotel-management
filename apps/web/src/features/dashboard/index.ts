export { DashboardOverviewView } from "./components/DashboardOverviewView";
export {
  DashboardStatCard,
  type DashboardStatCardProps,
} from "./components/DashboardStatCard";
export type { OccupancyChartProps, OccupancyDailyPoint } from "./components/OccupancyChart";
export {
  RecentBookingsCard,
  type RecentBookingsCardProps,
} from "./components/RecentBookingsCard";
export { ReportsSkeleton, ReportsView } from "./components/ReportsView";
export type { SalesBarChartProps, SalesDailyPoint } from "./components/SalesBarChart";
export { SalesChartCard, type SalesChartCardProps } from "./components/SalesChartCard";
export { SalesChartSkeleton, type SalesChartSkeletonProps } from "./components/SalesChartSkeleton";
export {
  RECENT_BOOKINGS_LIMIT,
  useCheckInsTodayQuery,
  useOccupancyReportQuery,
  useRecentBookingsQuery,
  useSalesReportQuery,
} from "./hooks/useDashboardQueries";
export {
  formatOccupancyRate,
  formatStatCount,
  getLast30DaysRange,
  type DashboardDateRange,
} from "./lib/dashboardFormat";
export {
  REPORT_PRESET_KEYS,
  buildUpdatedReportsUrl,
  getDefaultReportsRange,
  getLast7DaysRange,
  getReportPresets,
  getThisMonthRange,
  matchReportPreset,
  parseReportsSearchParams,
  type ParsedReportsParams,
  type ReportDatePreset,
  type ReportPresetKey,
} from "./lib/reportsParams";
