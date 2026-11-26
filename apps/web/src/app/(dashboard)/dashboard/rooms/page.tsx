import { Suspense } from "react";
import { AdminRoomsSkeleton, AdminRoomsView } from "@/features/rooms";

export default function DashboardRoomsPage() {
  return (
    <Suspense fallback={<AdminRoomsSkeleton />}>
      <AdminRoomsView />
    </Suspense>
  );
}
