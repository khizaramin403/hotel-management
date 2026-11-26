"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  CloseOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import type { Image, UploadUrlInput } from "@hotel/shared";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Popconfirm, Tag, Tooltip } from "antd";
import axios from "axios";
import { RoomImage } from "@/components/ui";
import {
  createRoomImageUploadUrl,
  deleteRoomImage,
  normalizeApiError,
  saveRoomImage,
  setRoomImageCover,
} from "@/lib/api";
import { getRoomImageSrc } from "@/lib/images";
import {
  addRoomImageInCache,
  removeRoomImageInCache,
  setRoomCoverImageInCache,
} from "../lib/roomCache";

export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES: readonly UploadUrlInput["fileType"][] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const ALLOWED_IMAGE_TYPE_SET = new Set<string>(ALLOWED_IMAGE_MIME_TYPES);

export interface ImageUploaderProps {
  mode: "create" | "edit";
  roomId?: number;
  roomNumber?: string;
  images: readonly Image[];
}

interface PendingUploadItem {
  localId: string;
  file: File;
  fileType: UploadUrlInput["fileType"];
  previewUrl: string | null;
  progress: number;
  isCoverOnCreate: boolean;
  status: "uploading" | "error";
  errorMessage?: string;
}

interface ImageRowError {
  type: "cover" | "delete";
  message: string;
}

function isRoomsMockActive(): boolean {
  if (process.env.NEXT_PUBLIC_USE_MOCKS !== "true") {
    return false;
  }
  const rawModules = process.env.NEXT_PUBLIC_MOCK_MODULES;
  if (!rawModules) {
    return false;
  }
  return rawModules.split(",").some((entry) => entry.trim().toLowerCase() === "rooms");
}

function createSafeObjectUrl(file: File): string | null {
  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    return URL.createObjectURL(file);
  }
  return null;
}

function revokeSafeObjectUrl(url: string | null | undefined): void {
  if (url && url.startsWith("blob:") && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

function generateLocalUploadId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPE_SET.has(file.type)) {
    return `${file.name}: Only JPEG, PNG, and WebP images are supported.`;
  }
  if (file.size <= 0) {
    return `${file.name}: Selected image file is empty.`;
  }
  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    return `${file.name}: File exceeds the 5 MB limit.`;
  }
  return null;
}

export function ImageUploader({ mode, roomId, roomNumber, images }: ImageUploaderProps) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUploadItem[]>([]);
  const [settingCoverId, setSettingCoverId] = useState<number | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [imageRowErrors, setImageRowErrors] = useState<Record<number, ImageRowError>>({});

  if (mode === "create" || !roomId) {
    return (
      <div>
        <span className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink">
          Photos
        </span>
        <p className="m-0 rounded-lg border border-dashed border-line-strong bg-canvas px-4 py-3 font-sans text-[13px] leading-[20px] text-muted">
          Save the room first, then add photos.
        </p>
      </div>
    );
  }

  const updatePendingItem = (localId: string, patch: Partial<PendingUploadItem>) => {
    setPendingUploads((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    );
  };

  const uploadItem = async (item: PendingUploadItem) => {
    const useMockMode = isRoomsMockActive();

    updatePendingItem(item.localId, {
      status: "uploading",
      progress: 0,
      errorMessage: undefined,
    });

    try {
      const { uploadUrl, key } = await createRoomImageUploadUrl(roomId, {
        fileType: item.fileType,
      });

      if (useMockMode) {
        updatePendingItem(item.localId, { progress: 100 });
      } else {
        await axios.put(uploadUrl, item.file, {
          headers: { "Content-Type": item.fileType },
          onUploadProgress: (progressEvent) => {
            const totalBytes = progressEvent.total ?? item.file.size;
            const pct =
              totalBytes > 0
                ? Math.min(100, Math.round((progressEvent.loaded / totalBytes) * 100))
                : 100;
            updatePendingItem(item.localId, { progress: pct });
          },
        });
      }

      const savedImage = await saveRoomImage(roomId, {
        key,
        isCover: item.isCoverOnCreate,
      });

      addRoomImageInCache(queryClient, roomId, savedImage, useMockMode ? item.previewUrl : null);

      if (!useMockMode) {
        revokeSafeObjectUrl(item.previewUrl);
      }

      setPendingUploads((prev) => prev.filter((entry) => entry.localId !== item.localId));
    } catch (error: unknown) {
      const apiError = normalizeApiError(error);
      updatePendingItem(item.localId, {
        status: "error",
        progress: 0,
        errorMessage: apiError.message || "Could not upload this photo. Try again.",
      });
    }
  };

  const handleSelectedFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const rejectionMessages: string[] = [];
    const newUploads: PendingUploadItem[] = [];
    const hasExistingImages = images.length > 0 || pendingUploads.length > 0;

    for (const file of Array.from(fileList)) {
      const errorText = validateImageFile(file);
      if (errorText) {
        rejectionMessages.push(errorText);
        continue;
      }

      const isCoverOnCreate = !hasExistingImages && newUploads.length === 0;
      newUploads.push({
        localId: generateLocalUploadId(),
        file,
        fileType: file.type as UploadUrlInput["fileType"],
        previewUrl: createSafeObjectUrl(file),
        progress: 0,
        isCoverOnCreate,
        status: "uploading",
      });
    }

    setValidationError(rejectionMessages.length > 0 ? rejectionMessages.join(" ") : null);

    if (newUploads.length === 0) {
      return;
    }

    setPendingUploads((prev) => [...prev, ...newUploads]);

    for (const item of newUploads) {
      void uploadItem(item);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleSelectedFiles(event.target.files);
    event.target.value = "";
  };

  const handleDragEnter = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setIsDragOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    handleSelectedFiles(event.dataTransfer?.files ?? null);
  };

  const handleDismissPending = (localId: string) => {
    setPendingUploads((prev) => {
      const target = prev.find((item) => item.localId === localId);
      if (target) {
        revokeSafeObjectUrl(target.previewUrl);
      }
      return prev.filter((item) => item.localId !== localId);
    });
  };

  const clearRowError = (imageId: number) => {
    setImageRowErrors((prev) => {
      if (!(imageId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[imageId];
      return next;
    });
  };

  const handleSetCover = async (image: Image) => {
    clearRowError(image.id);
    setSettingCoverId(image.id);
    try {
      const updated = await setRoomImageCover(roomId, image.id, { isCover: true });
      setRoomCoverImageInCache(queryClient, roomId, updated);
      message?.success?.({
        content: "Cover photo updated",
        duration: 3,
      });
    } catch (error: unknown) {
      const apiError = normalizeApiError(error);
      setImageRowErrors((prev) => ({
        ...prev,
        [image.id]: {
          type: "cover",
          message: apiError.message || "Could not set cover photo. Try again.",
        },
      }));
    } finally {
      setSettingCoverId((prev) => (prev === image.id ? null : prev));
    }
  };

  const handleDeleteImage = async (image: Image) => {
    clearRowError(image.id);
    setDeletingImageId(image.id);
    try {
      await deleteRoomImage(roomId, image.id);
      revokeSafeObjectUrl(image.urls.sm);
      removeRoomImageInCache(queryClient, roomId, image.id);
      message?.success?.({
        content: "Photo deleted",
        duration: 3,
      });
    } catch (error: unknown) {
      const apiError = normalizeApiError(error);
      setImageRowErrors((prev) => ({
        ...prev,
        [image.id]: {
          type: "delete",
          message: apiError.message || "Could not delete photo. Try again.",
        },
      }));
    } finally {
      setDeletingImageId((prev) => (prev === image.id ? null : prev));
    }
  };

  const handleRetryImageAction = (image: Image, rowError: ImageRowError) => {
    if (rowError.type === "cover") {
      void handleSetCover(image);
      return;
    }
    void handleDeleteImage(image);
  };

  const isMutatingSavedImage = settingCoverId !== null || deletingImageId !== null;
  const altPrefix = roomNumber ? `Room ${roomNumber}` : "Room";

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="room-form-photos-input"
          className="mb-1.5 block font-sans text-[14px] font-medium leading-[20px] text-ink"
        >
          Photos
        </label>

        <input
          id="room-form-photos-input"
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
          aria-label="Choose room photos"
          onChange={handleInputChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label="Drop images or click to upload"
          aria-describedby={validationError ? "room-form-photos-error" : "room-form-photos-hint"}
          className={`flex h-[120px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 text-center transition-[border-color,background-color] duration-[120ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 ${
            isDragOver
              ? "border-green-600 bg-green-50"
              : "border-line-strong bg-neutral-0 hover:border-green-600 hover:bg-green-50"
          }`}
        >
          <CloudUploadOutlined className="text-[24px] text-muted" aria-hidden="true" />
          <span className="font-sans text-[14px] font-medium leading-[20px] text-ink">
            Drop images or click to upload
          </span>
          <span
            id="room-form-photos-hint"
            className="font-sans text-[13px] leading-[20px] text-muted"
          >
            JPEG, PNG, or WebP up to 5 MB
          </span>
        </button>

        {validationError ? (
          <p
            id="room-form-photos-error"
            role="alert"
            className="mt-1.5 mb-0 flex items-start gap-1.5 font-sans text-[13px] leading-[20px] text-error"
          >
            <ExclamationCircleOutlined className="mt-0.5 shrink-0 text-[14px]" aria-hidden="true" />
            <span>{validationError}</span>
          </p>
        ) : null}
      </div>

      {images.length > 0 || pendingUploads.length > 0 ? (
        <ul aria-label="Room photos" className="m-0 list-none space-y-2 p-0">
          {images.map((image, index) => {
            const rowError = imageRowErrors[image.id];
            const isSettingThisCover = settingCoverId === image.id;
            const isDeletingThisImage = deletingImageId === image.id;

            return (
              <li
                key={image.id}
                data-testid={`room-photo-${image.id}`}
                className="rounded-md border border-line bg-neutral-0 p-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <RoomImage
                      src={getRoomImageSrc(image, "sm")}
                      alt={`${altPrefix} photo ${index + 1}`}
                      width={80}
                      height={60}
                      sizes="80px"
                      className="h-[60px] w-[80px] shrink-0 rounded-md"
                    />

                    <div className="min-w-0">
                      {image.isCover ? (
                        <Tag className="!m-0 !inline-flex !h-6 !items-center !gap-1.5 !rounded-sm !border-0 !bg-success-bg !px-2 font-sans !text-[12px] !font-medium !leading-[18px] !text-success-text">
                          <span
                            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success"
                            aria-hidden="true"
                          />
                          <span>Cover</span>
                        </Tag>
                      ) : (
                        <Button
                          type="text"
                          size="small"
                          loading={isSettingThisCover}
                          disabled={isMutatingSavedImage}
                          onClick={() => void handleSetCover(image)}
                        >
                          Set as cover
                        </Button>
                      )}
                    </div>
                  </div>

                  <Popconfirm
                    title="Delete this photo?"
                    description="This cannot be undone."
                    okText="Delete"
                    cancelText="Keep"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => void handleDeleteImage(image)}
                    disabled={isMutatingSavedImage}
                  >
                    <span className="inline-flex">
                      <Tooltip title="Delete photo">
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined aria-hidden="true" />}
                          aria-label={`Delete photo ${index + 1}`}
                          loading={isDeletingThisImage}
                          disabled={isMutatingSavedImage}
                        />
                      </Tooltip>
                    </span>
                  </Popconfirm>
                </div>

                {rowError ? (
                  <div
                    role="alert"
                    className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 font-sans text-[13px] leading-[20px] text-error"
                  >
                    <span className="flex items-center gap-1.5">
                      <ExclamationCircleOutlined className="shrink-0 text-[14px]" aria-hidden="true" />
                      <span>{rowError.message}</span>
                    </span>
                    <Button
                      type="text"
                      size="small"
                      onClick={() => handleRetryImageAction(image, rowError)}
                    >
                      Retry
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}

          {pendingUploads.map((item) => (
            <li key={item.localId} className="rounded-md border border-line bg-neutral-0 p-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <RoomImage
                    src={item.previewUrl}
                    alt={item.file.name}
                    width={80}
                    height={60}
                    sizes="80px"
                    className="h-[60px] w-[80px] shrink-0 rounded-md"
                  />

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="m-0 truncate font-sans text-[13px] font-medium leading-[20px] text-ink">
                      {item.file.name}
                    </p>
                    {item.status === "uploading" ? (
                      <div
                        role="progressbar"
                        aria-label={`Uploading ${item.file.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={item.progress}
                        className="h-1 w-full overflow-hidden rounded-full bg-green-200"
                      >
                        <div
                          className="h-full bg-green-600 transition-[width] duration-[120ms]"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {item.status === "error" ? (
                  <Tooltip title={`Dismiss ${item.file.name}`}>
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined aria-hidden="true" />}
                      aria-label={`Dismiss failed upload ${item.file.name}`}
                      onClick={() => handleDismissPending(item.localId)}
                    />
                  </Tooltip>
                ) : null}
              </div>

              {item.status === "error" && item.errorMessage ? (
                <div
                  role="alert"
                  className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 font-sans text-[13px] leading-[20px] text-error"
                >
                  <span className="flex items-center gap-1.5">
                    <ExclamationCircleOutlined className="shrink-0 text-[14px]" aria-hidden="true" />
                    <span>{item.errorMessage}</span>
                  </span>
                  <Button type="text" size="small" onClick={() => void uploadItem(item)}>
                    Retry
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
