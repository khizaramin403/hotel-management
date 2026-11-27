import { Suspense } from "react";
import { ReportsSkeleton, ReportsView } from "@/features/dashboard/components/ReportsView";

export default function DashboardReportsPage() {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <ReportsView />
    </Suspense>
  );
}
