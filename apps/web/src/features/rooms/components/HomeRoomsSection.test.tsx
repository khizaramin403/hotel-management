import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Room } from "@hotel/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockInitForTests } from "@/lib/api/client";
import * as roomsEndpoint from "@/lib/api/endpoints/rooms";
import { ApiClientError } from "@/lib/api/errors";
import { teardownMocks } from "@/mocks";
import { resetMockDb } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { buildUpdatedRoomsUrl, parseRoomsQueryParams } from "../lib/searchParams";
import { HomeRoomsSection } from "./HomeRoomsSection";

const mockPush = vi.fn();
let currentSearch = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
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

function renderRoomsSection(queryClient = createTestQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdProvider>
        <HomeRoomsSection />
      </AntdProvider>
    </QueryClientProvider>,
  );
}

const SAMPLE_ROOMS: Room[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  number: String(101 + index),
  type: "Deluxe",
  pricePerNight: 15000 + index * 500,
  capacity: 2,
  facilities: ["Wi-Fi", "Air conditioning"],
  description: "Sample room.",
  isActive: true,
  coverImage: null,
}));

describe("rooms URL query helpers", () => {
  it("parses all supported query params and resets page on filter updates", () => {
    const parsed = parseRoomsQueryParams(
      new URLSearchParams(
        "type=Suite&minPrice=10000&maxPrice=20000&guests=3&checkIn=2026-12-20&checkOut=2026-12-23&sort=price_desc&page=2",
      ),
    );
    expect(parsed).toEqual({
      type: "Suite",
      minPrice: 10000,
      maxPrice: 20000,
      guests: 3,
      checkIn: "2026-12-20",
      checkOut: "2026-12-23",
      sort: "price_desc",
      page: 2,
      limit: 12,
    });

    expect(
      buildUpdatedRoomsUrl(new URLSearchParams("page=2&guests=2"), {
        type: "Deluxe",
        resetPage: true,
      }),
    ).toBe("/?guests=2&type=Deluxe");
  });
});

describe("HomeRoomsSection", () => {
  beforeEach(() => {
    mockPush.mockReset();
    currentSearch = "";
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

  it("reads all URL params and forwards them to listRooms", async () => {
    currentSearch =
      "type=Deluxe&minPrice=10000&maxPrice=20000&guests=2&checkIn=2026-12-20&checkOut=2026-12-23&sort=price_asc&page=2";
    const listSpy = vi.spyOn(roomsEndpoint, "listRooms").mockResolvedValueOnce({
      data: SAMPLE_ROOMS.slice(0, 2),
      meta: { page: 2, limit: 12, total: 14, totalPages: 2 },
    });

    renderRoomsSection();

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith({
        type: "Deluxe",
        minPrice: 10000,
        maxPrice: 20000,
        guests: 2,
        checkIn: "2026-12-20",
        checkOut: "2026-12-23",
        sort: "price_asc",
        page: 2,
        limit: 12,
      });
      expect(screen.getAllByRole("link")).toHaveLength(2);
    });
  });

  it("updates the URL and resets page to 1 when clicking room type, price chips, and sort", async () => {
    currentSearch = "page=2&guests=2";
    vi.spyOn(roomsEndpoint, "listRooms").mockResolvedValue({
      data: SAMPLE_ROOMS,
      meta: { page: 2, limit: 12, total: 24, totalPages: 2 },
    });

    renderRoomsSection();

    await waitFor(() => {
      expect(screen.getAllByRole("link")).toHaveLength(12);
    });

    fireEvent.click(screen.getByRole("button", { name: "Deluxe" }));
    expect(mockPush).toHaveBeenLastCalledWith("/?guests=2&type=Deluxe", { scroll: false });

    fireEvent.click(screen.getByRole("button", { name: "Under 10,000" }));
    expect(mockPush).toHaveBeenLastCalledWith("/?guests=2&maxPrice=9999", { scroll: false });

    fireEvent.click(screen.getByRole("button", { name: "10,000 to 20,000" }));
    expect(mockPush).toHaveBeenLastCalledWith("/?guests=2&minPrice=10000&maxPrice=20000", {
      scroll: false,
    });

    fireEvent.click(screen.getByRole("button", { name: "Over 20,000" }));
    expect(mockPush).toHaveBeenLastCalledWith("/?guests=2&minPrice=20001", { scroll: false });

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(mockPush).toHaveBeenLastCalledWith("/?guests=2", { scroll: false });

    const sortSelect = screen.getByLabelText("Sort");
    fireEvent.mouseDown(sortSelect);
    await waitFor(() => {
      expect(screen.getByText("Price low to high")).toBeDefined();
    });
    fireEvent.click(screen.getByText("Price low to high"));
    expect(mockPush).toHaveBeenLastCalledWith("/?guests=2&sort=price_asc", { scroll: false });
  });

  it("toggles off an active price chip when clicked again", async () => {
    currentSearch = "minPrice=20001&page=2";
    vi.spyOn(roomsEndpoint, "listRooms").mockResolvedValue({
      data: SAMPLE_ROOMS.slice(0, 3),
      meta: { page: 2, limit: 12, total: 3, totalPages: 1 },
    });

    renderRoomsSection();

    await waitFor(() => {
      expect(screen.getAllByRole("link")).toHaveLength(3);
    });

    const overChip = screen.getByRole("button", { name: "Over 20,000" });
    expect(overChip.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(overChip);
    expect(mockPush).toHaveBeenLastCalledWith("/", { scroll: false });
  });

  it("updates page in URL and scrolls to top of the list on pagination change", async () => {
    currentSearch = "type=Deluxe";
    vi.spyOn(roomsEndpoint, "listRooms").mockResolvedValue({
      data: SAMPLE_ROOMS,
      meta: { page: 1, limit: 12, total: 24, totalPages: 2 },
    });

    const scrollSpy = vi.fn();
    renderRoomsSection();
    const listTopElement = document.getElementById("rooms-list-top");
    expect(listTopElement).not.toBeNull();
    if (listTopElement) {
      listTopElement.scrollIntoView = scrollSpy;
    }

    await waitFor(() => {
      expect(screen.getByTitle("2")).toBeDefined();
    });

    fireEvent.click(screen.getByTitle("2"));

    expect(mockPush).toHaveBeenCalledWith("/?type=Deluxe&page=2", { scroll: false });
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it("renders loading skeletons, Empty state with Clear filters reset, and Error Alert with Try again", async () => {
    currentSearch = "type=Suite&minPrice=20001";
    const listSpy = vi
      .spyOn(roomsEndpoint, "listRooms")
      .mockRejectedValueOnce(
        new ApiClientError({
          status: 500,
          code: "INTERNAL_ERROR",
          message: "Server error",
        }),
      );

    renderRoomsSection();

    expect(screen.getAllByTestId("room-card-skeleton")).toHaveLength(12);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText("Could not load rooms")).toBeDefined();
    });

    listSpy.mockResolvedValueOnce({
      data: [],
      meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
    });

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(screen.getByText("No rooms match these filters")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(mockPush).toHaveBeenCalledWith("/", { scroll: false });
  });
});
