"use client";

import { useState } from "react";
import Image from "next/image";
import { PictureOutlined } from "@ant-design/icons";
import { buildImageUrl, IMAGE_BLUR_DATA_URL } from "@/lib/images";

export interface RoomImageProps {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  preload?: boolean;
  priority?: boolean;
  className?: string;
}

export function RoomImage({
  src,
  alt,
  width,
  height,
  sizes,
  preload,
  priority,
  className = "",
}: RoomImageProps) {
  const resolvedSrc = buildImageUrl(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasFailed = resolvedSrc === null || failedSrc === resolvedSrc;

  if (hasFailed) {
    return (
      <div
        role="img"
        aria-label={alt}
        style={{ width, height, maxWidth: "100%" }}
        className={`flex items-center justify-center overflow-hidden bg-neutral-100 text-muted ${className}`.trim()}
      >
        <PictureOutlined className="text-[28px]" aria-hidden="true" />
      </div>
    );
  }

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      preload={preload ?? priority}
      placeholder="blur"
      blurDataURL={IMAGE_BLUR_DATA_URL}
      onError={() => setFailedSrc(resolvedSrc)}
      className={`block bg-neutral-100 object-cover ${className}`.trim()}
    />
  );
}
