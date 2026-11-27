import { RoomDetailView } from "@/features/rooms/components/RoomDetailView";

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = /^\d+$/.test(id) ? Number(id) : Number.NaN;

  return <RoomDetailView roomId={parsedId} />;
}
