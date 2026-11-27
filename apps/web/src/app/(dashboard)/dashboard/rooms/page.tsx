import { Suspense } from "react";
import { AdminRoomsSkeleton, AdminRoomsView } from "@/features/rooms/components/AdminRoomsView";

export default function DashboardRoomsPage() {
  return (
    <Suspense fallback={<AdminRoomsSkeleton />}>
      <AdminRoomsView />
    </Suspense>
  );
}
