"use client";

import { useEffect } from "react";
import type { Image } from "@hotel/shared";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Modal, Tooltip } from "antd";
import { RoomImage } from "@/components/ui";
import { getRoomImageSrc } from "@/lib/images";

export interface RoomGalleryLightboxProps {
  open: boolean;
  images: readonly Image[];
  activeIndex: number;
  roomTitle: string;
  onSelectIndex: (index: number) => void;
  onClose: () => void;
}

export function RoomGalleryLightbox({
  open,
  images,
  activeIndex,
  roomTitle,
  onSelectIndex,
  onClose,
}: RoomGalleryLightboxProps) {
  const total = images.length;
  const safeIndex = total > 0 ? ((activeIndex % total) + total) % total : 0;
  const currentImage = images[safeIndex] ?? null;
  const canNavigate = total > 1;

  const handlePrevious = () => {
    if (!canNavigate) return;
    onSelectIndex((safeIndex - 1 + total) % total);
  };

  const handleNext = () => {
    if (!canNavigate) return;
    onSelectIndex((safeIndex + 1) % total);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && canNavigate) {
        event.preventDefault();
        onSelectIndex((safeIndex - 1 + total) % total);
      } else if (event.key === "ArrowRight" && canNavigate) {
        event.preventDefault();
        onSelectIndex((safeIndex + 1) % total);
      } else if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canNavigate, onClose, onSelectIndex, open, safeIndex, total]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      centered
      destroyOnHidden
      styles={{
        mask: { backgroundColor: "rgba(20, 49, 44, 0.45)" },
      }}
      title={
        <span className="font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
          {roomTitle}
        </span>
      }
    >
      <div className="space-y-4">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-line bg-neutral-100">
          <RoomImage
            src={getRoomImageSrc(currentImage, "lg")}
            alt={`${roomTitle} photo ${safeIndex + 1} of ${Math.max(total, 1)}`}
            width={1600}
            height={1000}
            sizes="(min-width: 768px) 672px, 100vw"
            className="absolute inset-0 !h-full !w-full"
          />
        </div>

        {canNavigate ? (
          <div className="flex items-center justify-between">
            <Tooltip title="Previous photo">
              <Button
                icon={<LeftOutlined aria-hidden="true" />}
                aria-label="Previous photo"
                onClick={handlePrevious}
              />
            </Tooltip>

            <span className="font-sans text-[13px] leading-[20px] tabular text-muted">
              {safeIndex + 1} / {total}
            </span>

            <Tooltip title="Next photo">
              <Button
                icon={<RightOutlined aria-hidden="true" />}
                aria-label="Next photo"
                onClick={handleNext}
              />
            </Tooltip>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
