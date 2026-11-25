import { describe, expect, it } from "vitest";
import { bookingReference, formatDate, formatDateRange, formatPrice, plural } from "./format";

describe("formatPrice", () => {
  it("formats whole PKR amounts with en-GB thousands separators", () => {
    expect(formatPrice(0)).toBe("PKR 0");
    expect(formatPrice(15000)).toBe("PKR 15,000");
    expect(formatPrice(1250000)).toBe("PKR 1,250,000");
  });

  it("supports omitting the currency prefix for tables", () => {
    expect(formatPrice(45000, { includeCurrency: false })).toBe("45,000");
  });

  it("rounds fractional numbers and preserves negative sign", () => {
    expect(formatPrice(15000.4)).toBe("PKR 15,000");
    expect(formatPrice(-5000)).toBe("-PKR 5,000");
  });

  it("throws on non-finite numbers", () => {
    expect(() => formatPrice(Number.NaN)).toThrow(RangeError);
    expect(() => formatPrice(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("formatDate", () => {
  it("formats YYYY-MM-DD calendar dates in UTC using en-GB", () => {
    expect(formatDate("2026-12-20")).toBe("20 Dec 2026");
    expect(formatDate("2026-01-03")).toBe("3 Jan 2026");
  });

  it("formats UTC ISO timestamps and Date objects", () => {
    expect(formatDate("2026-11-25T23:45:00Z")).toBe("25 Nov 2026");
    expect(formatDate(new Date(Date.UTC(2026, 4, 9)))).toBe("9 May 2026");
  });

  it("supports omitting the year", () => {
    expect(formatDate("2026-12-20", { includeYear: false })).toBe("20 Dec");
  });

  it("throws on invalid calendar or timestamp dates", () => {
    expect(() => formatDate("2026-02-30")).toThrow(RangeError);
    expect(() => formatDate("not-a-date")).toThrow(RangeError);
  });
});

describe("formatDateRange", () => {
  it("formats same-month and cross-month/year ranges with en-GB Intl range formatting", () => {
    const sameMonthExpected = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).formatRange(new Date(Date.UTC(2026, 11, 20)), new Date(Date.UTC(2026, 11, 23)));

    const crossYearExpected = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).formatRange(new Date(Date.UTC(2026, 11, 28)), new Date(Date.UTC(2027, 0, 2)));

    expect(formatDateRange("2026-12-20", "2026-12-23")).toBe(sameMonthExpected);
    expect(formatDateRange("2026-12-28", "2027-01-02")).toBe(crossYearExpected);
  });

  it("supports omitting the year in ranges", () => {
    const expected = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).formatRange(new Date(Date.UTC(2026, 11, 20)), new Date(Date.UTC(2026, 11, 23)));

    expect(formatDateRange("2026-12-20", "2026-12-23", { includeYear: false })).toBe(expected);
  });
});

describe("bookingReference", () => {
  it("formats booking ids with BK- prefix", () => {
    expect(bookingReference(1041)).toBe("BK-1041");
    expect(bookingReference("42")).toBe("BK-42");
  });
});

describe("plural", () => {
  it("chooses singular for 1 and plural for 0 and >1 using en-GB rules", () => {
    expect(plural(1, "night")).toBe("1 night");
    expect(plural(0, "night")).toBe("0 nights");
    expect(plural(3, "guest")).toBe("3 guests");
    expect(plural(1000, "room")).toBe("1,000 rooms");
    expect(plural(2, "person", "people")).toBe("2 people");
  });
});
