import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Room, RoomDetail } from "@hotel/shared";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, queryKeys, type RoomsListResult } from "@/lib/api";
import { resetMockInitForTests } from "@/lib/api/client";
import * as roomsEndpoint from "@/lib/api/endpoints/rooms";
import { teardownMocks } from "@/mocks";
import { clearMockRoleCookie, resetMockDb, setMockRoleCookie } from "@/mocks/db";
import { AntdProvider } from "@/providers/AntdProvider";
import { makeStore } from "@/store";
import { setAuthUser } from "@/store/slices/authSlice";
import { RoomFormModal, type RoomFormModalMode } from "./RoomFormModal";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function makeRoomSummary(id: number, overrides: Partial<Room> = {}): Room {
  return {
    id,
    number: String(100 + id),
    type: "Deluxe",
    pricePerNight: 15000,
    capacity: 2,
    facilities: ["Wi-Fi", "Air conditioning"],
    description: "Quiet room with courtyard view.",
    isActive: true,
    coverImage: null,
    ...overrides,
  };
}

function makeRoomDetail(id: number, overrides: Partial<RoomDetail> = {}): RoomDetail {
  return {
    ...makeRoomSummary(id, overrides),
    images: [],
    ...overrides,
  };
}

function renderRoomFormModal({
  mode = "create",
  onClose = vi.fn(),
  queryClient = createTestQueryClient(),
}: {
  mode?: RoomFormModalMode;
  onClose?: () => void;
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
          <RoomFormModal mode={mode} onClose={onClose} />
        </AntdProvider>
      </QueryClientProvider>
    </Provider>,
  );

  return { store, queryClient, onClose, ...view };
}

describe("RoomFormModal", () => {
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

  it("validates required fields, PKR 1,000 min price, and 1 to 8 capacity without rendering active Switch on create", async () => {
    const createSpy = vi.spyOn(roomsEndpoint, "createRoom");

    renderRoomFormModal({ mode: "create" });

    // Modal width is 520, Active Switch is edit-only, and create mode shows photo helper copy
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Add room");
    const modalRoot = dialog.closest(".ant-modal") as HTMLElement | null;
    expect(modalRoot?.style.width).toBe("520px");
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.getByText("Save the room first, then add photos.")).toBeDefined();

    // Verify all 7 facility suggestions exist in the tags Select
    fireEvent.mouseDown(screen.getByLabelText("Facilities (optional)"));
    for (const suggestion of [
      "Wi-Fi",
      "Air conditioning",
      "Breakfast",
      "TV",
      "Mini fridge",
      "Balcony",
      "Parking",
    ]) {
      expect(
        await screen.findByText(suggestion, { selector: ".ant-select-item-option-content" }),
      ).toBeDefined();
    }

    // Submit empty form -> shows all required validation errors
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("Room number is required")).toBeDefined();
      expect(screen.getByText("Room type is required")).toBeDefined();
      expect(screen.getByText("Price per night is required")).toBeDefined();
      expect(screen.getByText("Capacity is required")).toBeDefined();
      expect(screen.getByText("Description is required")).toBeDefined();
    });

    // Out-of-bounds price (< 1,000) and capacity (> 8) trigger business bounds errors
    const priceInput = screen.getByLabelText("Price per night");
    fireEvent.change(priceInput, { target: { value: "500" } });
    fireEvent.blur(priceInput);

    const capacityInput = screen.getByLabelText("Capacity");
    fireEvent.change(capacityInput, { target: { value: "9" } });
    fireEvent.blur(capacityInput);

    await waitFor(() => {
      expect(screen.getByText("Price per night must be at least PKR 1,000")).toBeDefined();
      expect(screen.getByText("Capacity must be between 1 and 8")).toBeDefined();
    });

    expect(createSpy).not.toHaveBeenCalled();
  }, 15_000);

  it("creates a room, shows 'Room saved' toast, closes modal, and updates rooms caches without refetch", async () => {
    const queryClient = createTestQueryClient();
    const adminListKey = queryKeys.rooms.list({ includeInactive: true, page: 1, limit: 10 });
    const publicListKey = queryKeys.rooms.list({ page: 1, limit: 12 });

    queryClient.setQueryData<RoomsListResult>(adminListKey, {
      data: [makeRoomSummary(1, { number: "101" })],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    queryClient.setQueryData<RoomsListResult>(publicListKey, {
      data: [makeRoomSummary(1, { number: "101" })],
      meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
    });

    const createSpy = vi.spyOn(roomsEndpoint, "createRoom");
    const listSpy = vi.spyOn(roomsEndpoint, "listRooms");
    const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");
    const onClose = vi.fn();

    renderRoomFormModal({ mode: "create", onClose, queryClient });

    fireEvent.change(screen.getByLabelText("Room number"), { target: { value: "205" } });

    fireEvent.mouseDown(screen.getByLabelText("Type"));
    const deluxeOption = await screen.findByText("Deluxe", {
      selector: ".ant-select-item-option-content",
    });
    fireEvent.click(deluxeOption);

    fireEvent.change(screen.getByLabelText("Price per night"), { target: { value: "15000" } });
    fireEvent.change(screen.getByLabelText("Capacity"), { target: { value: "2" } });

    fireEvent.mouseDown(screen.getByLabelText("Facilities (optional)"));
    const wifiOption = await screen.findByText("Wi-Fi", {
      selector: ".ant-select-item-option-content",
    });
    fireEvent.click(wifiOption);
    const parkingOption = await screen.findByText("Parking", {
      selector: ".ant-select-item-option-content",
    });
    fireEvent.click(parkingOption);

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Bright corner room with garden view." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        number: "205",
        type: "Deluxe",
        pricePerNight: 15000,
        capacity: 2,
        facilities: ["Wi-Fi", "Parking"],
        description: "Bright corner room with garden view.",
      });
      expect(screen.getByText("Room saved")).toBeDefined();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    expect(setQueryDataSpy).toHaveBeenCalled();
    expect(listSpy).not.toHaveBeenCalled();

    const updatedAdminList = queryClient.getQueryData<RoomsListResult>(adminListKey);
    expect(updatedAdminList?.meta.total).toBe(2);
    expect(updatedAdminList?.data[0]?.number).toBe("205");

    const updatedPublicList = queryClient.getQueryData<RoomsListResult>(publicListKey);
    expect(updatedPublicList?.data[0]?.number).toBe("205");
  }, 15_000);

  it("shows 409 ROOM_NUMBER_TAKEN error directly on the number field and keeps modal open", async () => {
    const createSpy = vi.spyOn(roomsEndpoint, "createRoom").mockRejectedValueOnce(
      new ApiClientError({
        status: 409,
        code: "ROOM_NUMBER_TAKEN",
        message: "A room with this number already exists",
      }),
    );
    const onClose = vi.fn();

    renderRoomFormModal({ mode: "create", onClose });

    fireEvent.change(screen.getByLabelText("Room number"), { target: { value: "101" } });

    fireEvent.mouseDown(screen.getByLabelText("Type"));
    const singleOption = await screen.findByText("Single", {
      selector: ".ant-select-item-option-content",
    });
    fireEvent.click(singleOption);

    fireEvent.change(screen.getByLabelText("Price per night"), { target: { value: "6000" } });
    fireEvent.change(screen.getByLabelText("Capacity"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Standard single room." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByText("A room with this number already exists")).toBeDefined();
    });

    const numberInput = screen.getByLabelText("Room number");
    expect(numberInput.getAttribute("aria-invalid")).toBe("true");
    expect(numberInput.getAttribute("aria-describedby")).toBe("room-form-number-error");
    expect(onClose).not.toHaveBeenCalled();
  }, 15_000);

  it("pre-fills edit mode from the room detail query, supports Active switch, updates cache, and guards unsaved close with Popconfirm", async () => {
    const queryClient = createTestQueryClient();
    const tableSummary = makeRoomSummary(2, {
      number: "102",
      type: "Double",
      pricePerNight: 9000,
      capacity: 2,
      facilities: ["Wi-Fi"],
      description: "Summary description",
      isActive: true,
    });
    const fullDetail = makeRoomDetail(2, {
      number: "102",
      type: "Double",
      pricePerNight: 9500,
      capacity: 3,
      facilities: ["Wi-Fi", "Breakfast"],
      description: "Detailed room description fetched from GET /rooms/:id.",
      isActive: true,
    });

    const adminListKey = queryKeys.rooms.list({ includeInactive: true, page: 1, limit: 10 });
    queryClient.setQueryData<RoomsListResult>(adminListKey, {
      data: [tableSummary],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const getRoomSpy = vi.spyOn(roomsEndpoint, "getRoom").mockResolvedValue(fullDetail);
    const updateSpy = vi.spyOn(roomsEndpoint, "updateRoom");
    const onClose = vi.fn();

    renderRoomFormModal({ mode: tableSummary, onClose, queryClient });

    await waitFor(() => {
      expect(getRoomSpy).toHaveBeenCalledWith(2);
      expect((screen.getByLabelText("Description") as HTMLTextAreaElement).value).toBe(
        "Detailed room description fetched from GET /rooms/:id.",
      );
    });

    // Clean Cancel closes immediately without Popconfirm
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Discard changes?")).toBeNull();
    onClose.mockClear();

    // Edit price and toggle Active Switch -> closing asks Popconfirm 'Discard changes?'
    fireEvent.change(screen.getByLabelText("Price per night"), { target: { value: "12000" } });
    fireEvent.click(screen.getByRole("switch", { name: "Active" }));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.getByText("Discard changes?")).toBeDefined();
    });
    expect(onClose).not.toHaveBeenCalled();

    // Keep keeps modal and unsaved changes intact
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    await waitFor(() => {
      expect((screen.getByLabelText("Price per night") as HTMLInputElement).value).toBe("12,000");
    });

    // Saving calls PATCH /rooms/:id and updates cache without refetch
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(2, {
        number: "102",
        type: "Double",
        pricePerNight: 12000,
        capacity: 3,
        facilities: ["Wi-Fi", "Breakfast"],
        description: "Detailed room description fetched from GET /rooms/:id.",
        isActive: false,
      });
      expect(screen.getByText("Room saved")).toBeDefined();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    const updatedAdminList = queryClient.getQueryData<RoomsListResult>(adminListKey);
    expect(updatedAdminList?.data[0]?.pricePerNight).toBe(12000);
    expect(updatedAdminList?.data[0]?.isActive).toBe(false);
  }, 15_000);
});
