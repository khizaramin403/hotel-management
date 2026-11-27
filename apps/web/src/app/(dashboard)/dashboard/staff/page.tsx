import { Suspense } from "react";
import { StaffSkeleton, StaffView } from "@/features/staff/components/StaffView";

export default function DashboardStaffPage() {
  return (
    <Suspense fallback={<StaffSkeleton />}>
      <StaffView />
    </Suspense>
  );
}
