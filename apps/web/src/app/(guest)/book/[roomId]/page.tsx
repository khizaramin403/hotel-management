import { BookingFlowView } from "@/features/bookings";

export default async function BookRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const parsedId = /^\d+$/.test(roomId) ? Number(roomId) : Number.NaN;

  return <BookingFlowView roomId={parsedId} />;
}
