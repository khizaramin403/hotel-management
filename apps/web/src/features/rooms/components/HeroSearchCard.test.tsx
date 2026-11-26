import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatCalendarDate } from "@/lib/datePicker";
import { AntdProvider } from "@/providers/AntdProvider";
import { buildHeroSearchUrl, parseHeroSearchParams } from "../lib/searchParams";
import { HeroSearchCard } from "./HeroSearchCard";

const mockPush = vi.fn();
let currentSearch = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

function addDaysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatCalendarDate(date);
}

function renderSearchCard() {
  return render(
    <AntdProvider>
      <HeroSearchCard />
    </AntdProvider>,
  );
}

describe("searchParams helpers", () => {
  it("parses valid URL params and falls back safely for invalid values", () => {
    expect(
      parseHeroSearchParams(
        new URLSearchParams("checkIn=2026-12-20&checkOut=2026-12-23&guests=4&type=Suite"),
      ),
    ).toEqual({
      checkIn: "2026-12-20",
      checkOut: "2026-12-23",
      guests: 4,
      type: "Suite",
    });

    expect(
      parseHeroSearchParams(
        new URLSearchParams("checkIn=2026-12-23&checkOut=2026-12-20&guests=99&type=Penthouse"),
      ),
    ).toEqual({
      guests: 1,
    });
  });

  it("builds expected URL query string", () => {
    expect(
      buildHeroSearchUrl({
        checkIn: "2026-12-20",
        checkOut: "2026-12-23",
        guests: 2,
        type: "Deluxe",
      }),
    ).toBe("/?checkIn=2026-12-20&checkOut=2026-12-23&guests=2&type=Deluxe");

    expect(buildHeroSearchUrl({ guests: 1 })).toBe("/?guests=1");
  });
});

describe("HeroSearchCard", () => {
  beforeEach(() => {
    mockPush.mockReset();
    currentSearch = "";
  });

  it("stacks vertically on mobile and enforces guests bounds 1 to 6", () => {
    const { container } = renderSearchCard();

    const grid = container.querySelector("form > div");
    expect(grid?.className).toContain("grid-cols-1");

    const decreaseButton = screen.getByRole("button", { name: "Decrease guests" });
    const increaseButton = screen.getByRole("button", { name: "Increase guests" });

    expect(screen.getByTestId("guests-stepper-value").textContent).toBe("1 guest");
    expect((decreaseButton as HTMLButtonElement).disabled).toBe(true);

    for (let step = 0; step < 5; step += 1) {
      fireEvent.click(increaseButton);
    }

    expect(screen.getByTestId("guests-stepper-value").textContent).toBe("6 guests");
    expect((increaseButton as HTMLButtonElement).disabled).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("reads initial values from URL params and pushes updated search URL on submit", async () => {
    const initialCheckIn = addDaysFromToday(2);
    const initialCheckOut = addDaysFromToday(5);
    currentSearch = `checkIn=${initialCheckIn}&checkOut=${initialCheckOut}&guests=2&type=Double`;

    renderSearchCard();

    const checkInInput = screen.getByPlaceholderText("Check-in") as HTMLInputElement;
    const checkOutInput = screen.getByPlaceholderText("Check-out") as HTMLInputElement;
    expect(checkInInput.value).toBe(initialCheckIn);
    expect(checkOutInput.value).toBe(initialCheckOut);
    expect(screen.getByTestId("guests-stepper-value").textContent).toBe("2 guests");

    const nextCheckIn = addDaysFromToday(10);
    const nextCheckOut = addDaysFromToday(13);

    fireEvent.mouseDown(checkInInput);
    fireEvent.change(checkInInput, { target: { value: nextCheckIn } });
    fireEvent.keyDown(checkInInput, { key: "Enter", code: "Enter" });

    fireEvent.change(checkOutInput, { target: { value: nextCheckOut } });
    fireEvent.keyDown(checkOutInput, { key: "Enter", code: "Enter" });

    fireEvent.click(screen.getByRole("button", { name: "Increase guests" }));
    expect(screen.getByTestId("guests-stepper-value").textContent).toBe("3 guests");

    const roomTypeSelect = screen.getByLabelText("Room type");
    fireEvent.mouseDown(roomTypeSelect);
    await waitFor(() => {
      expect(screen.getByText("Deluxe")).toBeDefined();
    });
    fireEvent.click(screen.getByText("Deluxe"));

    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      `/?checkIn=${nextCheckIn}&checkOut=${nextCheckOut}&guests=3&type=Deluxe`,
    );
  });

  it("shows an inline validation error and blocks push when check-out is not after check-in", async () => {
    renderSearchCard();

    const sameDay = addDaysFromToday(3);
    const checkInInput = screen.getByPlaceholderText("Check-in") as HTMLInputElement;
    const checkOutInput = screen.getByPlaceholderText("Check-out") as HTMLInputElement;

    fireEvent.focus(checkInInput);
    fireEvent.change(checkInInput, { target: { value: sameDay } });
    fireEvent.keyDown(checkInInput, { key: "Enter", code: "Enter" });
    fireEvent.blur(checkInInput);

    fireEvent.focus(checkOutInput);
    fireEvent.change(checkOutInput, { target: { value: sameDay } });
    fireEvent.keyDown(checkOutInput, { key: "Enter", code: "Enter" });
    fireEvent.blur(checkOutInput);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(screen.getByText("Check-out date must be after check-in date.")).toBeDefined();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("disables dates earlier than today in the calendar popup", async () => {
    renderSearchCard();

    const checkInInput = screen.getByPlaceholderText("Check-in");
    fireEvent.focus(checkInInput);
    fireEvent.click(checkInInput);

    const yesterday = addDaysFromToday(-1);
    const today = addDaysFromToday(0);

    await waitFor(() => {
      const todayCell = document.querySelector(`td[title="${today}"]`);
      expect(todayCell).not.toBeNull();
    });

    const todayCell = document.querySelector(`td[title="${today}"]`);
    expect(todayCell?.className).not.toContain("ant-picker-cell-disabled");

    const yesterdayCell = document.querySelector(`td[title="${yesterday}"]`);
    if (yesterdayCell) {
      expect(yesterdayCell.className).toContain("ant-picker-cell-disabled");
    }
  });
});
