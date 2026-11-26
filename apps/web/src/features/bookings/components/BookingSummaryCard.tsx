"use client";

import type { RoomDetail } from "@hotel/shared";
import { Price, RoomImage } from "@/components/ui";
import { formatDateRange, formatPrice, plural } from "@/lib/format";
import { getRoomImageSrc } from "@/lib/images";

export interface BookingSummaryCardProps {
  room: Pick<RoomDetail, "id" | "number" | "type" | "pricePerNight" | "coverImage" | "images">;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  subtotal: number;
  taxAmount: number;
  totalPrice: number;
}

export function BookingSummaryCard({
  room,
  checkIn,
  checkOut,
  guests,
  nights,
  subtotal,
  taxAmount,
  totalPrice,
}: BookingSummaryCardProps) {
  const thumbnailImage = room.coverImage ?? room.images[0] ?? null;
  const thumbnailSrc = getRoomImageSrc(thumbnailImage, "sm");
  const roomTitle = `${room.type} · Room ${room.number}`;
  const stayMeta = `${formatDateRange(checkIn, checkOut)} · ${plural(guests, "guest")}`;

  return (
    <div
      data-testid="booking-summary-card"
      className="rounded-lg border border-line bg-neutral-0 p-6"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md bg-neutral-100">
        <RoomImage
          src={thumbnailSrc}
          alt={roomTitle}
          width={400}
          height={250}
          sizes="(min-width: 992px) 380px, 100vw"
          className="absolute inset-0 !h-full !w-full"
        />
      </div>

      <div className="mt-4">
        <h2 className="m-0 font-sans text-[18px] font-semibold leading-[26px] text-ink">
          {roomTitle}
        </h2>
        <p className="mt-1 mb-0 font-sans text-[13px] leading-[20px] text-muted">{stayMeta}</p>
      </div>

      <div className="mt-4 space-y-2 border-t border-line pt-4 font-sans text-[14px] leading-[22px] text-ink">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted">
            {plural(nights, "night")} x {formatPrice(room.pricePerNight, { includeCurrency: false })}
          </span>
          <span className="tabular">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted">Taxes (10%)</span>
          <span className="tabular">{formatPrice(taxAmount)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-2 border-t border-line pt-4">
        <span className="font-sans text-[14px] font-medium leading-[22px] text-ink">Total</span>
        <Price amount={totalPrice} size="md" />
      </div>
    </div>
  );
}
