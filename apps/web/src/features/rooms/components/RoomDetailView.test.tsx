import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { RoomDetail } from "@hotel/shared";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockInitForTests } from "@/lib/api/client";
import * as roomsEndpoint from "@/lib/api/endpoints/rooms";
import { ApiClientError } from "@/lib/api/errors";
import { teardownMocks } from "@/mocks";
import { resetMockDb } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { makeStore } from "@/store";
import { RoomDetailView } from "./RoomDetailView";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderRoomDetail(roomId: number, queryClient = createTestQueryClient()) {
  return render(
    <Provider store={makeStore()}>
      <QueryClientProvider client={queryClient}>
        <AntdProvider>
          <RoomDetailView roomId={roomId} />
        </AntdProvider>
      </QueryClientProvider>
    </Provider>,
  );
}

const LONG_DESCRIPTION =
  "Top-tier deluxe corner suite overlooking the courtyard gardens with natural daylight throughout the day. Features custom oak joinery, blackout linen drapery, quiet double-glazed windows, a shaded private terrace for morning tea, dedicated work area with task lighting, and calm warm neutral finishes designed for unhurried stays. " +
  "Includes daily housekeeping, complimentary mineral water, and flexible evening turndown service on request.";

const SAMPLE_DETAIL: RoomDetail = {
  id: 8,
  number: "204",
  type: "Deluxe",
  pricePerNight: 18500,
  capacity: 3,
  facilities: ["Wi-Fi", "Air conditioning", "Helipad access"],
  description: LONG_DESCRIPTION,
  isActive: true,
  coverImage: {
    id: 22,
    key: "rooms/room-08-1.webp",
    isCover: true,
    sortOrder: 0,
    urls: {
      sm: "/images/rooms/room-08-1.webp",
      md: "/images/rooms/room-08-1.webp",
      lg: "/images/rooms/room-08-1.webp",
    },
  },
  images: [
    {
      id: 22,
      key: "rooms/room-08-1.webp",
      isCover: true,
      sortOrder: 0,
      urls: {
        sm: "/images/rooms/room-08-1.webp",
        md: "/images/rooms/room-08-1.webp",
        lg: "/images/rooms/room-08-1.webp",
      },
    },
    {
      id: 23,
      key: "rooms/room-08-2.webp",
      isCover: false,
      sortOrder: 1,
      urls: {
        sm: "/images/rooms/room-08-2.webp",
        md: "/images/rooms/room-08-2.webp",
        lg: "/images/rooms/room-08-2.webp",
      },
    },
    {
      id: 24,
      key: "rooms/room-08-3.webp",
      isCover: false,
      sortOrder: 2,
      urls: {
        sm: "/images/rooms/room-08-3.webp",
        md: "/images/rooms/room-08-3.webp",
        lg: "/images/rooms/room-08-3.webp",
      },
    },
  ],
};

describe("RoomDetailView", () => {
  beforeEach(() => {
    mockPush.mockReset();
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "rooms");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("renders loading skeleton, breadcrumb, title, meta, facility icons, description toggle, thumbnail swap, and lightbox", async () => {
    vi.spyOn(roomsEndpoint, "getRoom").mockResolvedValueOnce(SAMPLE_DETAIL);

    renderRoomDetail(8);

    expect(screen.getByRole("status", { name: "Loading room details" })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Deluxe · Room 204" })).toBeDefined();
    });

    const roomsBreadcrumbLink = screen.getByRole("link", { name: "Rooms" });
    expect(roomsBreadcrumbLink.getAttribute("href")).toBe("/");
    expect(screen.getByText("Room 204")).toBeDefined();
    expect(screen.getByText("Room 204 · Deluxe · 3 guests")).toBeDefined();

    // Known facility maps to specific icon; unknown facility falls back to check icon.
    const wifiTag = screen.getByText("Wi-Fi").closest(".ant-tag");
    expect(wifiTag?.querySelector('[data-icon="wifi"]')).not.toBeNull();
    const unknownTag = screen.getByText("Helipad access").closest(".ant-tag");
    expect(unknownTag?.querySelector('[data-icon="check"]')).not.toBeNull();

    // Long description shows Read more / Show less toggle.
    const readMoreButton = screen.getByRole("button", { name: "Read more" });
    fireEvent.click(readMoreButton);
    expect(screen.getByRole("button", { name: "Show less" })).toBeDefined();

    // Main image starts at photo 1; clicking thumbnail 2 swaps the main image.
    const mainTrigger = screen.getByRole("button", {
      name: "Open photo gallery for Deluxe · Room 204",
    });
    const initialMainImg = mainTrigger.querySelector("img") as HTMLImageElement;
    expect(initialMainImg.alt).toBe("Deluxe · Room 204 photo 1");
    expect(decodeURIComponent(initialMainImg.src)).toContain("room-08-1.webp");

    const thumb2 = screen.getByRole("button", { name: "View photo 2 of 3" });
    fireEvent.click(thumb2);

    const swappedMainImg = mainTrigger.querySelector("img") as HTMLImageElement;
    expect(swappedMainImg.alt).toBe("Deluxe · Room 204 photo 2");
    expect(decodeURIComponent(swappedMainImg.src)).toContain("room-08-2.webp");
    expect(thumb2.getAttribute("aria-pressed")).toBe("true");

    // Clicking main image opens dynamic lightbox Modal, arrow keys move, Esc closes and returns focus.
    mainTrigger.focus();
    fireEvent.click(mainTrigger);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });
    expect(screen.getByText("2 / 3")).toBeDefined();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() => {
      expect(screen.getByText("3 / 3")).toBeDefined();
    });

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    await waitFor(() => {
      expect(screen.getByText("2 / 3")).toBeDefined();
    });

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(mainTrigger);
    });
  });

  it("renders 404 Result 'Room not found' when room is missing from the API or id is invalid", async () => {
    renderRoomDetail(999);

    await waitFor(() => {
      expect(screen.getByText("Room not found")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Back to home" }));
    expect(mockPush).toHaveBeenCalledWith("/");

    const getSpy = vi.spyOn(roomsEndpoint, "getRoom");
    renderRoomDetail(Number.NaN);
    expect(screen.getAllByText("Room not found")).toHaveLength(2);
    expect(getSpy).not.toHaveBeenCalled();
  });

  it("renders error Alert with Try again and refetches on retry", async () => {
    const getSpy = vi
      .spyOn(roomsEndpoint, "getRoom")
      .mockRejectedValueOnce(
        new ApiClientError({
          status: 500,
          code: "INTERNAL_ERROR",
          message: "Server error",
        }),
      )
      .mockResolvedValueOnce(SAMPLE_DETAIL);

    renderRoomDetail(8);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText("Could not load room details")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Deluxe · Room 204" })).toBeDefined();
    });
    expect(getSpy).toHaveBeenCalledTimes(2);
  });
});
