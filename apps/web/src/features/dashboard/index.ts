export { DashboardOverviewView } from "./components/DashboardOverviewView";
export {
  DashboardStatCard,
  type DashboardStatCardProps,
} from "./components/DashboardStatCard";
export {
  RecentBookingsCard,
  type RecentBookingsCardProps,
} from "./components/RecentBookingsCard";
export type { SalesBarChartProps, SalesDailyPoint } from "./components/SalesBarChart";
export { SalesChartCard, type SalesChartCardProps } from "./components/SalesChartCard";
export { SalesChartSkeleton } from "./components/SalesChartSkeleton";
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
