import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Image, Room, RoomDetail } from "@hotel/shared";
import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys, type RoomsListResult } from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import * as roomsEndpoint from "@/lib/api/endpoints/rooms";
import { teardownMocks } from "@/mocks";
import { clearMockRoleCookie, resetMockDb, setMockRoleCookie } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { ImageUploader, MAX_IMAGE_FILE_SIZE_BYTES } from "./ImageUploader";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function makeRoomImage(id: number, overrides: Partial<Image> = {}): Image {
  return {
    id,
    key: `rooms/room-05-${id}.webp`,
    isCover: id === 1,
    sortOrder: id - 1,
    urls: {
      sm: `/images/rooms/room-05-${id}.webp`,
      md: `/images/rooms/room-05-${id}.webp`,
      lg: `/images/rooms/room-05-${id}.webp`,
    },
    ...overrides,
  };
}

function makeRoomDetail(id: number, images: Image[]): RoomDetail {
  const coverImage = images.find((img) => img.isCover) ?? images[0] ?? null;
  const summary: Room = {
    id,
    number: "201",
    type: "Deluxe",
    pricePerNight: 15000,
    capacity: 2,
    facilities: ["Wi-Fi", "Breakfast"],
    description: "Second-floor deluxe room.",
    isActive: true,
    coverImage,
  };
  return {
    ...summary,
    images,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function StatefulImageUploaderHarness({
  queryClient,
  roomId,
  mode,
}: {
  queryClient: QueryClient;
  roomId?: number;
  mode: "create" | "edit";
}) {
  const detail = roomId ? queryClient.getQueryData<RoomDetail>(queryKeys.rooms.detail(roomId)) : undefined;
  return (
    <ImageUploader
      mode={mode}
      roomId={roomId}
      roomNumber={detail?.number ?? "201"}
      images={detail?.images ?? []}
    />
  );
}

describe("ImageUploader", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth,rooms");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
    setMockRoleCookie("admin");
  });

  afterEach(() => {
    clearMockRoleCookie();
    vi.restoreAllMocks();
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("shows helper copy in create mode and validates file type and 5 MB max size in edit mode", async () => {
    const queryClient = createTestQueryClient();
    const uploadUrlSpy = vi.spyOn(roomsEndpoint, "createRoomImageUploadUrl");

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <AntdProvider>
          <ImageUploader mode="create" images={[]} />
        </AntdProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Save the room first, then add photos.")).toBeDefined();
    expect(screen.queryByLabelText("Choose room photos")).toBeNull();

    rerender(
      <QueryClientProvider client={queryClient}>
        <AntdProvider>
          <ImageUploader mode="edit" roomId={5} roomNumber="201" images={[]} />
        </AntdProvider>
      </QueryClientProvider>,
    );

    const dropButton = screen.getByRole("button", { name: /Drop images or click to upload/i });
    expect(dropButton.className).toContain("h-[120px]");
    expect(dropButton.className).toContain("border-dashed");

    // Reject unsupported file type
    const badTypeFile = new File(["gif-data"], "animation.gif", { type: "image/gif" });
    const fileInput = screen.getByLabelText("Choose room photos") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [badTypeFile] } });

    await waitFor(() => {
      expect(
        screen.getByText("animation.gif: Only JPEG, PNG, and WebP images are supported."),
      ).toBeDefined();
    });
    expect(uploadUrlSpy).not.toHaveBeenCalled();

    // Reject oversized (> 5 MB) file via drag-and-drop
    const oversizedFile = new File(["huge"], "too-large.jpg", { type: "image/jpeg" });
    Object.defineProperty(oversizedFile, "size", {
      value: MAX_IMAGE_FILE_SIZE_BYTES + 1,
    });
    fireEvent.drop(dropButton, {
      dataTransfer: {
        files: [oversizedFile],
      },
    });

    await waitFor(() => {
      expect(screen.getByText("too-large.jpg: File exceeds the 5 MB limit.")).toBeDefined();
    });
    expect(uploadUrlSpy).not.toHaveBeenCalled();
  });

  it("executes upload-url -> PUT with progress bar -> save-image in exact order in non-mock mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "");

    const queryClient = createTestQueryClient();
    const initialDetail = makeRoomDetail(5, []);
    queryClient.setQueryData<RoomDetail>(queryKeys.rooms.detail(5), initialDetail);

    const adminListKey = queryKeys.rooms.list({ includeInactive: true, page: 1, limit: 10 });
    queryClient.setQueryData<RoomsListResult>(adminListKey, {
      data: [{ ...initialDetail, coverImage: null }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const callOrder: string[] = [];
    const putDeferred = createDeferred<void>();

    const uploadUrlSpy = vi
      .spyOn(roomsEndpoint, "createRoomImageUploadUrl")
      .mockImplementation(async () => {
        callOrder.push("upload-url");
        return {
          uploadUrl: "https://s3.example.com/presigned-put",
          key: "rooms/room-05-new.webp",
        };
      });

    const putSpy = vi.spyOn(axios, "put").mockImplementation(async (url, _data, config) => {
      callOrder.push(`put:${url}`);
      config?.onUploadProgress?.({
        loaded: 50,
        total: 100,
      } as Parameters<NonNullable<NonNullable<typeof config>["onUploadProgress"]>>[0]);
      await putDeferred.promise;
      return { status: 200 };
    });

    const savedResult = makeRoomImage(77, {
      key: "rooms/room-05-new.webp",
      isCover: true,
      sortOrder: 0,
      urls: {
        sm: "https://cdn.example.com/rooms/room-05-new-sm.webp",
        md: "https://cdn.example.com/rooms/room-05-new-md.webp",
        lg: "https://cdn.example.com/rooms/room-05-new-lg.webp",
      },
    });

    const saveImageSpy = vi.spyOn(roomsEndpoint, "saveRoomImage").mockImplementation(async () => {
      callOrder.push("save-image");
      return savedResult;
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <AntdProvider>
          <StatefulImageUploaderHarness queryClient={queryClient} roomId={5} mode="edit" />
        </AntdProvider>
      </QueryClientProvider>,
    );

    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      rerender(
        <QueryClientProvider client={queryClient}>
          <AntdProvider>
            <StatefulImageUploaderHarness queryClient={queryClient} roomId={5} mode="edit" />
          </AntdProvider>
        </QueryClientProvider>,
      );
    });

    const webpFile = new File(["webp-bytes"], "suite-view.webp", { type: "image/webp" });
    const fileInput = screen.getByLabelText("Choose room photos") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [webpFile] } });

    await waitFor(() => {
      expect(callOrder).toEqual(["upload-url", "put:https://s3.example.com/presigned-put"]);
      const progressBar = screen.getByRole("progressbar", { name: "Uploading suite-view.webp" });
      expect(progressBar.getAttribute("aria-valuenow")).toBe("50");
      expect(progressBar.className).toContain("h-1");
    });

    // Save endpoint must NOT be called before PUT resolves
    expect(saveImageSpy).not.toHaveBeenCalled();

    putDeferred.resolve();

    await waitFor(() => {
      expect(callOrder).toEqual([
        "upload-url",
        "put:https://s3.example.com/presigned-put",
        "save-image",
      ]);
      expect(within(screen.getByTestId("room-photo-77")).getByText("Cover")).toBeDefined();
    });

    expect(uploadUrlSpy).toHaveBeenCalledWith(5, { fileType: "image/webp" });
    expect(putSpy).toHaveBeenCalledWith(
      "https://s3.example.com/presigned-put",
      webpFile,
      expect.objectContaining({
        headers: { "Content-Type": "image/webp" },
      }),
    );
    expect(saveImageSpy).toHaveBeenCalledWith(5, {
      key: "rooms/room-05-new.webp",
      isCover: true,
    });

    const updatedListCache = queryClient.getQueryData<RoomsListResult>(adminListKey);
    expect(updatedListCache?.data[0]?.coverImage?.id).toBe(77);

    unsubscribe();
  });

  it("skips PUT and displays local object URL in mock mode, switches cover, deletes with Popconfirm, and retries failed uploads", async () => {
    const queryClient = createTestQueryClient();
    const initialDetail = await roomsEndpoint.getRoom(5);
    const seedImages = initialDetail.images.slice(0, 2);
    const firstSeedImage = seedImages[0]!;
    const secondSeedImage = seedImages[1]!;

    queryClient.setQueryData<RoomDetail>(queryKeys.rooms.detail(5), {
      ...initialDetail,
      images: seedImages,
      coverImage: firstSeedImage,
    });

    const createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:mock-room-photo");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const putSpy = vi.spyOn(axios, "put");

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <AntdProvider>
          <StatefulImageUploaderHarness queryClient={queryClient} roomId={5} mode="edit" />
        </AntdProvider>
      </QueryClientProvider>,
    );

    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      rerender(
        <QueryClientProvider client={queryClient}>
          <AntdProvider>
            <StatefulImageUploaderHarness queryClient={queryClient} roomId={5} mode="edit" />
          </AntdProvider>
        </QueryClientProvider>,
      );
    });

    // Existing thumbnails render 80x60 with Cover Tag and Set as cover button
    const photoList = screen.getByRole("list", { name: "Room photos" });
    const firstImg = within(photoList).getByAltText("Room 201 photo 1") as HTMLImageElement;
    expect(firstImg.getAttribute("width")).toBe("80");
    expect(firstImg.getAttribute("height")).toBe("60");
    expect(within(screen.getByTestId(`room-photo-${firstSeedImage.id}`)).getByText("Cover")).toBeDefined();

    // Fail upload first -> shows per-file error with Retry button under thumbnail -> Retry hits real mock handler
    const uploadUrlSpy = vi
      .spyOn(roomsEndpoint, "createRoomImageUploadUrl")
      .mockRejectedValueOnce(new Error("Upload URL timeout"));
    const saveImageSpy = vi.spyOn(roomsEndpoint, "saveRoomImage");

    const pngFile = new File(["png-data"], "balcony.png", { type: "image/png" });
    const fileInput = screen.getByLabelText("Choose room photos") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [pngFile] } });

    await waitFor(() => {
      expect(screen.getByText("Upload URL timeout")).toBeDefined();
      expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(uploadUrlSpy).toHaveBeenCalledTimes(2);
      expect(saveImageSpy).toHaveBeenCalledTimes(1);
      const uploadedThumb = within(screen.getByRole("list", { name: "Room photos" })).getByAltText(
        "Room 201 photo 3",
      ) as HTMLImageElement;
      expect(uploadedThumb.getAttribute("src")).toBe("blob:mock-room-photo");
    });

    const uploadedImageId =
      queryClient.getQueryData<RoomDetail>(queryKeys.rooms.detail(5))?.images[2]?.id ?? 0;
    expect(uploadedImageId).toBeGreaterThan(0);
    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(putSpy).not.toHaveBeenCalled();

    // Set second photo as cover
    const setCoverSpy = vi.spyOn(roomsEndpoint, "setRoomImageCover");
    const setAsCoverButtons = screen.getAllByRole("button", { name: "Set as cover" });
    fireEvent.click(setAsCoverButtons[0] as HTMLElement);

    await waitFor(() => {
      expect(setCoverSpy).toHaveBeenCalledWith(5, secondSeedImage.id, { isCover: true });
      expect(
        within(screen.getByTestId(`room-photo-${secondSeedImage.id}`)).getByText("Cover"),
      ).toBeDefined();
      expect(
        within(screen.getByTestId(`room-photo-${firstSeedImage.id}`)).queryByText("Cover"),
      ).toBeNull();
    });

    // Delete third photo (local blob URL) via Popconfirm
    const deleteSpy = vi.spyOn(roomsEndpoint, "deleteRoomImage");
    fireEvent.click(screen.getByRole("button", { name: "Delete photo 3" }));

    await waitFor(() => {
      expect(screen.getByText("Delete this photo?")).toBeDefined();
    });

    const popconfirmDelete = screen
      .getAllByRole("button", { name: "Delete" })
      .find((btn) => btn.closest(".ant-popconfirm"));
    fireEvent.click(popconfirmDelete as HTMLElement);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(5, uploadedImageId);
      expect(screen.queryByAltText("Room 201 photo 3")).toBeNull();
    });
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:mock-room-photo");

    unsubscribe();
  }, 15_000);
});
