import { Suspense } from "react";
import { ReportsSkeleton, ReportsView } from "@/features/dashboard";

export default function DashboardReportsPage() {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <ReportsView />
    </Suspense>
  );
}
