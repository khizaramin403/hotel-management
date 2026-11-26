import { Suspense } from "react";
import { MyBookingsSkeleton, MyBookingsView } from "@/features/bookings";

export default function MyBookingsPage() {
  return (
    <Suspense fallback={<MyBookingsSkeleton />}>
      <MyBookingsView />
    </Suspense>
  );
}
