import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeHero } from "./HomeHero";

describe("HomeHero", () => {
  it("renders Display headline, one-line subtitle, 35% green overlay, and responsive height classes", () => {
    const { container } = render(<HomeHero />);

    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section?.className).toContain("h-[280px]");
    expect(section?.className).toContain("md:h-[360px]");

    const heading = screen.getByRole("heading", { level: 1, name: "Find your room" });
    expect(heading.className).toContain("font-serif");
    expect(heading.className).toContain("text-neutral-0");

    expect(
      screen.getByText("Browse available rooms and check dates for your stay."),
    ).toBeDefined();

    const overlay = container.querySelector(".bg-green-800\\/35");
    expect(overlay).not.toBeNull();

    const img = screen.getByAltText("Grand Hotel exterior and rooms") as HTMLImageElement;
    expect(img.getAttribute("src")).toContain("hero.webp");

    fireEvent.error(img);
    const fallback = screen.getByRole("img", { name: "Grand Hotel exterior and rooms" });
    expect(fallback.tagName).toBe("DIV");
  });
});
