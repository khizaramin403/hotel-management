import { Suspense } from "react";
import { StaffSkeleton, StaffView } from "@/features/staff";

export default function DashboardStaffPage() {
  return (
    <Suspense fallback={<StaffSkeleton />}>
      <StaffView />
    </Suspense>
  );
}
