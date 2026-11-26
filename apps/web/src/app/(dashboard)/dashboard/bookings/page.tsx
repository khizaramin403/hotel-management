import { Suspense } from "react";
import { StaffBookingsSkeleton, StaffBookingsView } from "@/features/bookings";

export default function DashboardBookingsPage() {
  return (
    <Suspense fallback={<StaffBookingsSkeleton />}>
      <StaffBookingsView />
    </Suspense>
  );
}
