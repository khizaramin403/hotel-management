import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import * as roomsEndpoint from "@/lib/api/endpoints/rooms";
import { ApiClientError } from "@/lib/api/errors";
import { teardownMocks } from "@/mocks";
import { resetMockDb } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { HomeRoomsSection } from "../components/HomeRoomsSection";
import { useRoomsQuery } from "./useRoomsQuery";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AntdProvider>{children}</AntdProvider>
      </QueryClientProvider>
    );
  };
}

describe("useRoomsQuery", () => {
  beforeEach(() => {
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

  it("queries rooms with default params using queryKeys and preserves placeholderData across pages", async () => {
    const queryClient = createTestQueryClient();
    const listSpy = vi.spyOn(roomsEndpoint, "listRooms");

    const { result, rerender } = renderHook(
      ({ page }: { page: number }) => useRoomsQuery({ page, limit: 6 }),
      {
        initialProps: { page: 1 },
        wrapper: createWrapper(queryClient),
      },
    );

    expect(result.current.isPending).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(listSpy).toHaveBeenCalledWith({ page: 1, limit: 6 });
    expect(queryClient.getQueryData(queryKeys.rooms.list({ page: 1, limit: 6 }))).toBeDefined();
    expect(result.current.data?.data).toHaveLength(6);
    const pageOneFirstRoomId = result.current.data?.data[0]?.id;

    let resolvePageTwo: ((value: roomsEndpoint.RoomsListResult) => void) | undefined;
    listSpy.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePageTwo = resolve;
        }),
    );

    rerender({ page: 2 });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(true);
    });
    expect(result.current.isPending).toBe(false);
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.data[0]?.id).toBe(pageOneFirstRoomId);

    resolvePageTwo?.({
      data: [
        {
          id: 7,
          number: "203",
          type: "Deluxe",
          pricePerNight: 17500,
          capacity: 3,
          facilities: ["Wi-Fi", "Air conditioning"],
          description: "Corner deluxe room.",
          isActive: true,
          coverImage: null,
        },
      ],
      meta: { page: 2, limit: 6, total: 12, totalPages: 2 },
    });

    await waitFor(() => {
      expect(result.current.isPlaceholderData).toBe(false);
    });
    expect(result.current.data?.data[0]?.id).toBe(7);
  });

  it("renders loading skeletons, error Alert with Try again retry, empty state, and room cards in HomeRoomsSection", async () => {
    const queryClient = createTestQueryClient();
    const listSpy = vi
      .spyOn(roomsEndpoint, "listRooms")
      .mockRejectedValueOnce(
        new ApiClientError({
          status: 500,
          code: "INTERNAL_ERROR",
          message: "Server error",
        }),
      );

    render(<HomeRoomsSection />, { wrapper: createWrapper(queryClient) });

    expect(screen.getAllByTestId("room-card-skeleton")).toHaveLength(12);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText("Could not load rooms")).toBeDefined();
    });

    const retryButton = screen.getByRole("button", { name: "Try again" });
    listSpy.mockResolvedValueOnce({
      data: [],
      meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
    });

    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText("No rooms available")).toBeDefined();
    });

    listSpy.mockRestore();
    const freshClient = createTestQueryClient();
    render(<HomeRoomsSection />, { wrapper: createWrapper(freshClient) });

    await waitFor(() => {
      expect(screen.getAllByRole("link")).toHaveLength(12);
    });
  });
});
