"use client";

import { memo } from "react";
import Link from "next/link";
import type { Room } from "@hotel/shared";
import { Price, RoomImage } from "@/components/ui";
import { plural } from "@/lib/format";
import { getRoomImageSrc } from "@/lib/images";

export interface RoomCardProps {
  room: Room;
}

const ROOM_CARD_IMAGE_SIZES =
  "(min-width: 1600px) 270px, (min-width: 1200px) 368px, (min-width: 992px) 33vw, (min-width: 576px) 50vw, 100vw";

export const RoomCard = memo(function RoomCard({ room }: RoomCardProps) {
  const imageSrc = getRoomImageSrc(room.coverImage, "sm");
  const title = `${room.type} · Room ${room.number}`;
  const guestLabel = plural(room.capacity, "guest");
  const highlights = room.facilities.slice(0, 2).join(", ");
  const metaText = highlights.length > 0 ? `${guestLabel} - ${highlights}` : guestLabel;

  return (
    <Link
      href={`/rooms/${room.id}`}
      className="block overflow-hidden rounded-lg border border-line bg-neutral-0 text-inherit no-underline transition-[border-color,box-shadow] duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] hover:border-green-200 hover:shadow-e1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        <RoomImage
          src={imageSrc}
          alt={`${room.type} Room ${room.number} for up to ${guestLabel}`}
          width={400}
          height={300}
          sizes={ROOM_CARD_IMAGE_SIZES}
          className="absolute inset-0 !h-full !w-full"
        />
      </div>

      <div className="p-4">
        <h2 className="m-0 truncate font-sans text-[18px] font-semibold leading-[26px] text-ink">
          {title}
        </h2>
        <p className="mt-1 mb-0 truncate font-sans text-[13px] font-normal leading-[20px] text-muted">
          {metaText}
        </p>
        <div className="mt-3">
          <Price amount={room.pricePerNight} perNight size="sm" />
        </div>
      </div>
    </Link>
  );
});
