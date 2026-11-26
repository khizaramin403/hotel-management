import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Room } from "@hotel/shared";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, queryKeys } from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import * as roomsEndpoint from "@/lib/api/endpoints/rooms";
import { teardownMocks } from "@/mocks";
import { clearMockRoleCookie, resetMockDb, setMockRoleCookie } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { makeStore } from "@/store";
import { setAuthUser } from "@/store/slices/authSlice";
import { ADMIN_ROOM_SEARCH_DEBOUNCE_MS } from "./AdminRoomsFilterBar";
import { AdminRoomsView } from "./AdminRoomsView";

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

function renderAdminRooms({
  queryClient = createTestQueryClient(),
}: {
  queryClient?: QueryClient;
} = {}) {
  const store = makeStore();
  store.dispatch(
    setAuthUser({
      id: 3,
      name: "Hina Malik",
      email: "admin@example.com",
      role: "admin",
    }),
  );

  const view = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AntdProvider>
          <AdminRoomsView />
        </AntdProvider>
      </QueryClientProvider>
    </Provider>,
  );

  return { store, queryClient, ...view };
}

function makeRoom(id: number, overrides: Partial<Room> = {}): Room {
  return {
    id,
    number: String(100 + id),
    type: "Deluxe",
    pricePerNight: 15000,
    capacity: 2,
    facilities: ["Wi-Fi", "Air conditioning"],
    description: "Quiet room with courtyard view.",
    isActive: true,
    coverImage: {
      id: id * 10,
      key: `rooms/room-0${id}-1.webp`,
      isCover: true,
      sortOrder: 0,
      urls: {
        sm: `/images/rooms/room-0${id}-1.webp`,
        md: `/images/rooms/room-0${id}-1.webp`,
        lg: `/images/rooms/room-0${id}-1.webp`,
      },
    },
    ...overrides,
  };
}

describe("AdminRoomsView", () => {
  beforeEach(() => {
    mockPush.mockReset();
    currentSearch = "";
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_MOCK_MODULES", "auth,rooms");
    vi.stubEnv("NEXT_PUBLIC_MOCK_LATENCY", "0");
    resetMockInitForTests();
    resetMockDb();
    teardownMocks();
    setMockRoleCookie("admin");
  });

  afterEach(() => {
    vi.useRealTimers();
    clearMockRoleCookie();
    vi.restoreAllMocks();
    teardownMocks();
    resetMockDb();
    resetMockInitForTests();
    vi.unstubAllEnvs();
  });

  it("syncs search by number (debounced), Type Select, Status Select, and 10/20/50 pagination in the URL with includeInactive=true", async () => {
    currentSearch = "q=20&type=Deluxe&status=inactive&page=2&limit=20";
    const listSpy = vi.spyOn(roomsEndpoint, "listRooms").mockResolvedValue({
      data: [makeRoom(5, { number: "201", type: "Deluxe", isActive: false })],
      meta: { page: 2, limit: 20, total: 25, totalPages: 2 },
    });

    const { rerender, store, queryClient } = renderAdminRooms();

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith({
        q: "20",
        type: "Deluxe",
        includeInactive: true,
        isActive: false,
        page: 2,
        limit: 20,
      });
    });

    const tableRegion = await screen.findByTestId("admin-rooms-table");
    expect(tableRegion.className).toContain("dashboard-rooms-table");

    // Pagination page change preserves active filters
    fireEvent.click(within(tableRegion).getByRole("listitem", { name: "1" }));
    expect(mockPush).toHaveBeenCalledWith(
      "/dashboard/rooms?q=20&type=Deluxe&status=inactive&limit=20",
      { scroll: false },
    );

    // Changing page size to 50 updates limit=50 and resets page
    const sizeChanger = tableRegion.querySelector(
      ".ant-pagination-options-size-changer .ant-select-selector",
    ) as HTMLElement;
    fireEvent.mouseDown(sizeChanger);
    const option50 = await screen.findByText("50 / page");
    fireEvent.click(option50);
    expect(mockPush).toHaveBeenCalledWith(
      "/dashboard/rooms?q=20&type=Deluxe&status=inactive&limit=50",
      { scroll: false },
    );

    // Reset URL to clean defaults and verify default includeInactive=true query + filter interactions
    currentSearch = "";
    rerender(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AntdProvider>
            <AdminRoomsView />
          </AntdProvider>
        </QueryClientProvider>
      </Provider>,
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith({
        includeInactive: true,
        page: 1,
        limit: 10,
      });
    });

    mockPush.mockClear();

    // Type Select updates type in URL
    fireEvent.mouseDown(screen.getByLabelText("Type"));
    const suiteOption = await screen.findByText("Suite");
    fireEvent.click(suiteOption);
    expect(mockPush).toHaveBeenCalledWith("/dashboard/rooms?type=Suite", { scroll: false });

    // Status Select updates status in URL
    fireEvent.mouseDown(screen.getByLabelText("Status"));
    const activeOption = await screen.findByText("Active", {
      selector: ".ant-select-item-option-content",
    });
    fireEvent.click(activeOption);
    expect(mockPush).toHaveBeenCalledWith("/dashboard/rooms?status=active", { scroll: false });

    // Search input debounces 300ms before pushing ?q=...
    mockPush.mockClear();
    vi.useFakeTimers();

    const searchInput = screen.getByLabelText("Search");
    fireEvent.change(searchInput, { target: { value: "302" } });

    act(() => {
      vi.advanceTimersByTime(ADMIN_ROOM_SEARCH_DEBOUNCE_MS - 50);
    });
    expect(mockPush).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(mockPush).toHaveBeenCalledWith("/dashboard/rooms?q=302", { scroll: false });
  }, 15_000);

  it("renders table columns, 56x40 thumbnail, Active/Inactive StatusTag, placeholder Add/Edit Modals, and deletes rooms with Popconfirm, toast, and cache update", async () => {
    const queryClient = createTestQueryClient();
    // Seed a cached public active-only list to verify delete updates both admin and public caches
    queryClient.setQueryData(queryKeys.rooms.list({ page: 1, limit: 12 }), {
      data: [makeRoom(1, { number: "101", type: "Single", pricePerNight: 6000 })],
      meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
    });

    const listSpy = vi.spyOn(roomsEndpoint, "listRooms");
    const deactivateSpy = vi.spyOn(roomsEndpoint, "deactivateRoom");
    const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");

    renderAdminRooms({ queryClient });

    const tableRegion = await screen.findByTestId("admin-rooms-table");
    const listCallsBeforeDelete = listSpy.mock.calls.length;

    for (const headerName of ["Room", "Type", "Price", "Status", "Actions"]) {
      expect(within(tableRegion).getByRole("columnheader", { name: headerName })).toBeDefined();
    }

    // Thumbnail is 56x40
    const row101 = within(tableRegion).getByText("Room 101").closest("tr") as HTMLElement;
    const thumb = row101.querySelector("img") as HTMLImageElement;
    expect(thumb).not.toBeNull();
    expect(thumb.getAttribute("width")).toBe("56");
    expect(thumb.getAttribute("height")).toBe("40");
    expect(within(row101).getByText("Single")).toBeDefined();
    expect(within(row101).getByText("PKR 6,000")).toBeDefined();
    expect(within(row101).getByText("Active")).toBeDefined();

    // Primary 'Add room' opens placeholder Modal
    fireEvent.click(screen.getByRole("button", { name: "Add room" }));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
      expect(
        screen.getByText("The room create and edit form will be added in the next step."),
      ).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.getByRole("dialog").className).toContain("ant-zoom-leave");
    });

    // 'Edit' opens placeholder Modal for that room
    fireEvent.click(within(row101).getByRole("button", { name: "Edit" }));
    await waitFor(() => {
      expect(screen.getByText("Edit room 101")).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.getByRole("dialog").className).toContain("ant-zoom-leave");
    });

    // Delete calls Popconfirm 'Delete this room? This cannot be undone.' -> DELETE /rooms/:id + toast + setQueryData
    fireEvent.click(within(row101).getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(screen.getByText("Delete this room?")).toBeDefined();
      expect(screen.getByText("This cannot be undone.")).toBeDefined();
    });

    const popconfirmDeleteButton = screen
      .getAllByRole("button", { name: "Delete" })
      .find((btn) => btn.closest(".ant-popconfirm"));
    expect(popconfirmDeleteButton).toBeDefined();
    fireEvent.click(popconfirmDeleteButton as HTMLElement);

    await waitFor(() => {
      expect(deactivateSpy).toHaveBeenCalledWith(1);
      expect(screen.getByText("Room 101 deleted.")).toBeDefined();
    });

    // Cache updated via setQueryData with zero list refetch
    expect(setQueryDataSpy).toHaveBeenCalled();
    expect(listSpy.mock.calls.length).toBe(listCallsBeforeDelete);

    const updatedRow101 = within(screen.getByTestId("admin-rooms-table"))
      .getByText("Room 101")
      .closest("tr") as HTMLElement;
    expect(within(updatedRow101).getByText("Inactive")).toBeDefined();
    expect(
      (within(updatedRow101).getByRole("button", { name: "Delete" }) as HTMLButtonElement).disabled,
    ).toBe(true);

    const updatedPublicCache = queryClient.getQueryData<roomsEndpoint.RoomsListResult>(
      queryKeys.rooms.list({ page: 1, limit: 12 }),
    );
    expect(updatedPublicCache?.data).toHaveLength(0);

    // Failed delete shows error toast and keeps row Active
    deactivateSpy.mockRejectedValueOnce(
      new ApiClientError({
        status: 500,
        code: "INTERNAL_ERROR",
        message: "Could not deactivate room",
      }),
    );

    const row102 = within(screen.getByTestId("admin-rooms-table"))
      .getByText("Room 102")
      .closest("tr") as HTMLElement;
    fireEvent.click(within(row102).getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(screen.getAllByText("Delete this room?").length).toBeGreaterThan(0);
    });
    const confirmButtons = screen
      .getAllByRole("button", { name: "Delete" })
      .filter((btn) => btn.closest(".ant-popconfirm"));
    fireEvent.click(confirmButtons[confirmButtons.length - 1] as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText("Could not deactivate room")).toBeDefined();
    });
    expect(within(row102).getByText("Active")).toBeDefined();
  }, 15_000);

  it("renders skeleton rows, Empty with Clear filters, and error Alert with Try again", async () => {
    currentSearch = "q=999";
    const listSpy = vi
      .spyOn(roomsEndpoint, "listRooms")
      .mockResolvedValueOnce({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      })
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        data: [makeRoom(1, { number: "101", isActive: true })],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

    const { rerender, store, queryClient } = renderAdminRooms();

    expect(screen.getByRole("status", { name: "Loading rooms" })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("No rooms match these filters")).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(mockPush).toHaveBeenCalledWith("/dashboard/rooms", { scroll: false });

    currentSearch = "";
    rerender(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AntdProvider>
            <AdminRoomsView />
          </AntdProvider>
        </QueryClientProvider>
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Could not load rooms")).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledTimes(3);
      expect(within(screen.getByTestId("admin-rooms-table")).getByText("Room 101")).toBeDefined();
    });
  });
});
