import { fireEvent, render, screen } from "@testing-library/react";
import type { Room } from "@hotel/shared";
import { describe, expect, it } from "vitest";
import { RoomCard } from "./RoomCard";

const SAMPLE_ROOM: Room = {
  id: 5,
  number: "201",
  type: "Deluxe",
  pricePerNight: 15000,
  capacity: 2,
  facilities: ["Wi-Fi", "Air conditioning", "Balcony"],
  description: "Second-floor deluxe room with a private balcony.",
  isActive: true,
  coverImage: {
    id: 13,
    key: "rooms/room-05-1.webp",
    isCover: true,
    sortOrder: 0,
    urls: {
      sm: "/images/rooms/room-05-1.webp",
      md: "/images/rooms/room-05-1.webp",
      lg: "/images/rooms/room-05-1.webp",
    },
  },
};

describe("RoomCard", () => {
  it("renders title, meta, formatted PKR price, and wraps the card in one Link to /rooms/[id]", () => {
    render(<RoomCard room={SAMPLE_ROOM} />);

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/rooms/5");

    expect(screen.getByText("Deluxe · Room 201")).toBeDefined();
    expect(screen.getByText("2 guests - Wi-Fi, Air conditioning")).toBeDefined();
    expect(screen.getByText("PKR 15,000")).toBeDefined();
    expect(screen.getByText("per night")).toBeDefined();

    const img = screen.getByAltText("Deluxe Room 201 for up to 2 guests");
    expect(img.tagName).toBe("IMG");
  });

  it("handles singular guest count, empty facilities, and missing coverImage placeholder", () => {
    const singleRoom: Room = {
      ...SAMPLE_ROOM,
      id: 1,
      number: "101",
      type: "Single",
      pricePerNight: 6000,
      capacity: 1,
      facilities: [],
      coverImage: null,
    };

    render(<RoomCard room={singleRoom} />);

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/rooms/1");
    expect(screen.getByText("Single · Room 101")).toBeDefined();
    expect(screen.getByText("1 guest")).toBeDefined();
    expect(screen.getByText("PKR 6,000")).toBeDefined();
    expect(screen.getByRole("img", { name: "Single Room 101 for up to 1 guest" })).toBeDefined();
  });

  it("switches to the neutral fallback placeholder if the image fails to load", () => {
    render(<RoomCard room={SAMPLE_ROOM} />);

    const img = screen.getByAltText("Deluxe Room 201 for up to 2 guests");
    fireEvent.error(img);

    const fallback = screen.getByRole("img", { name: "Deluxe Room 201 for up to 2 guests" });
    expect(fallback.tagName).toBe("DIV");
  });

  it("is wrapped in React.memo", () => {
    expect((RoomCard as unknown as { $$typeof?: symbol }).$$typeof).toBe(Symbol.for("react.memo"));
  });
});
