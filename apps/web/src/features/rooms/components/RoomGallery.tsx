"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Image } from "@hotel/shared";
import { RoomImage } from "@/components/ui";
import { getRoomImageSrc } from "@/lib/images";

const RoomGalleryLightbox = dynamic(
  () => import("./RoomGalleryLightbox").then((mod) => mod.RoomGalleryLightbox),
  { ssr: false },
);

export interface RoomGalleryProps {
  images: readonly Image[];
  coverImage: Image | null;
  roomTitle: string;
}

const MAX_THUMBNAILS = 4;

function normalizeGalleryImages(
  images: readonly Image[],
  coverImage: Image | null,
): Image[] {
  if (images.length > 0) {
    return [...images].sort((a, b) => {
      if (a.isCover !== b.isCover) {
        return a.isCover ? -1 : 1;
      }
      return a.sortOrder - b.sortOrder || a.id - b.id;
    });
  }

  return coverImage ? [coverImage] : [];
}

export function RoomGallery({ images, coverImage, roomTitle }: RoomGalleryProps) {
  const galleryImages = useMemo(
    () => normalizeGalleryImages(images, coverImage),
    [coverImage, images],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const mainTriggerRef = useRef<HTMLButtonElement | null>(null);

  const safeIndex = activeIndex < galleryImages.length ? activeIndex : 0;
  const activeImage = galleryImages[safeIndex] ?? null;
  const thumbnails = galleryImages.slice(0, MAX_THUMBNAILS);

  const handleCloseLightbox = () => {
    setLightboxOpen(false);
    window.setTimeout(() => {
      mainTriggerRef.current?.focus();
    }, 0);
  };

  return (
    <div className="space-y-3">
      <button
        ref={mainTriggerRef}
        type="button"
        disabled={galleryImages.length === 0}
        aria-label={
          galleryImages.length > 0
            ? `Open photo gallery for ${roomTitle}`
            : `No photos available for ${roomTitle}`
        }
        onClick={() => setLightboxOpen(true)}
        className="relative block aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-lg border border-line bg-neutral-100 p-0 text-left transition-[border-color] duration-[120ms] hover:border-green-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:cursor-default disabled:hover:border-line"
      >
        <RoomImage
          src={getRoomImageSrc(activeImage, "md")}
          alt={`${roomTitle} photo ${safeIndex + 1}`}
          width={800}
          height={500}
          sizes="(min-width: 992px) 66vw, 100vw"
          priority
          className="absolute inset-0 !h-full !w-full"
        />
      </button>

      {thumbnails.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {thumbnails.map((image, index) => {
            const isSelected = index === safeIndex;
            return (
              <button
                key={image.id}
                type="button"
                aria-label={`View photo ${index + 1} of ${galleryImages.length}`}
                aria-pressed={isSelected}
                onClick={() => setActiveIndex(index)}
                className={`relative aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-md bg-neutral-100 p-0 transition-[border-color] duration-[120ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 ${
                  isSelected
                    ? "border-2 border-green-600"
                    : "border border-line hover:border-green-300"
                }`}
              >
                <RoomImage
                  src={getRoomImageSrc(image, "sm")}
                  alt={`${roomTitle} thumbnail ${index + 1}`}
                  width={400}
                  height={300}
                  sizes="(min-width: 992px) 16vw, 25vw"
                  className="absolute inset-0 !h-full !w-full"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {lightboxOpen ? (
        <RoomGalleryLightbox
          open={lightboxOpen}
          images={galleryImages}
          activeIndex={safeIndex}
          roomTitle={roomTitle}
          onSelectIndex={setActiveIndex}
          onClose={handleCloseLightbox}
        />
      ) : null}
    </div>
  );
}
