import type { Image, ImageUrls } from "@hotel/shared";

const DEFAULT_IMAGE_BASE_URL = "/images";
const ABSOLUTE_URL_REGEX = /^(https?:\/\/|data:|blob:)/i;

const NEUTRAL_PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><rect width="4" height="3" fill="#EFEDE6"/></svg>';

export const IMAGE_BLUR_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  NEUTRAL_PLACEHOLDER_SVG,
)}`;

export function getImageBaseUrl(): string {
  const envBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.trim();
  return envBase && envBase.length > 0 ? envBase : DEFAULT_IMAGE_BASE_URL;
}

/** Resolves a relative image key/path against NEXT_PUBLIC_IMAGE_BASE_URL. */
export function buildImageUrl(
  pathOrUrl: string | null | undefined,
  baseUrl: string = getImageBaseUrl(),
): string | null {
  if (!pathOrUrl) {
    return null;
  }

  const trimmed = pathOrUrl.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (ABSOLUTE_URL_REGEX.test(trimmed)) {
    return trimmed;
  }

  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  if (normalizedBase.length > 0 && normalizedPath.startsWith(`${normalizedBase}/`)) {
    return normalizedPath;
  }

  return `${normalizedBase}${normalizedPath}`;
}

/** Extracts the requested size URL from a room Image object (or raw path) and normalizes it. */
export function getRoomImageSrc(
  image: Pick<Image, "key" | "urls"> | string | null | undefined,
  size: keyof ImageUrls = "sm",
  baseUrl: string = getImageBaseUrl(),
): string | null {
  if (!image) {
    return null;
  }

  if (typeof image === "string") {
    return buildImageUrl(image, baseUrl);
  }

  return buildImageUrl(image.urls[size] ?? image.key, baseUrl);
}
