import { render, screen } from "@testing-library/react";
import type { Room } from "@hotel/shared";
import { describe, expect, it } from "vitest";
import { AntdProvider } from "@/providers/AntdProvider";
import { RoomGrid } from "./RoomGrid";

const SAMPLE_ROOMS: Room[] = [
  {
    id: 1,
    number: "101",
    type: "Single",
    pricePerNight: 6000,
    capacity: 1,
    facilities: ["Wi-Fi", "TV"],
    description: "Quiet single room.",
    isActive: true,
    coverImage: null,
  },
  {
    id: 5,
    number: "201",
    type: "Deluxe",
    pricePerNight: 15000,
    capacity: 2,
    facilities: ["Wi-Fi", "Air conditioning"],
    description: "Spacious deluxe room.",
    isActive: true,
    coverImage: null,
  },
];

function renderWithAntd(ui: React.ReactNode) {
  return render(<AntdProvider>{ui}</AntdProvider>);
}

describe("RoomGrid", () => {
  it("renders 12 skeleton cards while loading", () => {
    renderWithAntd(<RoomGrid isLoading />);

    const status = screen.getByRole("status", { name: "Loading rooms" });
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(status.className).toContain("grid-cols-1");
    expect(status.className).toContain("sm:grid-cols-2");
    expect(status.className).toContain("lg:grid-cols-3");
    expect(status.className).toContain("2xl:grid-cols-4");

    expect(screen.getAllByTestId("room-card-skeleton")).toHaveLength(12);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders custom skeletonCount when specified", () => {
    renderWithAntd(<RoomGrid isLoading skeletonCount={4} />);
    expect(screen.getAllByTestId("room-card-skeleton")).toHaveLength(4);
  });

  it("renders room cards keyed by room id when loaded", () => {
    renderWithAntd(<RoomGrid rooms={SAMPLE_ROOMS} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]?.getAttribute("href")).toBe("/rooms/1");
    expect(links[1]?.getAttribute("href")).toBe("/rooms/5");
    expect(screen.getByText("PKR 6,000")).toBeDefined();
    expect(screen.getByText("PKR 15,000")).toBeDefined();
  });

  it("renders empty state when rooms list is empty and not loading", () => {
    renderWithAntd(<RoomGrid rooms={[]} emptyTitle="No rooms available" />);
    expect(screen.getByText("No rooms available")).toBeDefined();
    expect(screen.queryAllByTestId("room-card-skeleton")).toHaveLength(0);
  });
});
