import { describe, expect, it } from "vitest";
import { calcTotals, isValidCalendarDate, nightsBetween } from "./money";
import { ALLOWED_BOOKING_TRANSITIONS, canTransitionBookingStatus } from "./enums";

describe("calcTotals", () => {
  it("calculates subtotal, 10% rounded tax, and totalPrice", () => {
    expect(calcTotals(3, 10000)).toEqual({
      subtotal: 30000,
      taxAmount: 3000,
      totalPrice: 33000,
    });
  });

  it("rounds 10% tax to nearest whole rupee", () => {
    expect(calcTotals(1, 1055)).toEqual({
      subtotal: 1055,
      taxAmount: 106,
      totalPrice: 1161,
    });

    expect(calcTotals(1, 1054)).toEqual({
      subtotal: 1054,
      taxAmount: 105,
      totalPrice: 1159,
    });
  });

  it("handles zero nights or zero price", () => {
    expect(calcTotals(0, 8000)).toEqual({
      subtotal: 0,
      taxAmount: 0,
      totalPrice: 0,
    });
  });

  it("throws on negative or non-integer inputs", () => {
    expect(() => calcTotals(-1, 5000)).toThrow(RangeError);
    expect(() => calcTotals(1.5, 5000)).toThrow(RangeError);
    expect(() => calcTotals(2, -100)).toThrow(RangeError);
    expect(() => calcTotals(2, 100.5)).toThrow(RangeError);
  });
});

describe("nightsBetween & isValidCalendarDate", () => {
  it("computes exact nights across month and year boundaries", () => {
    expect(nightsBetween("2026-12-30", "2027-01-02")).toBe(3);
    expect(nightsBetween("2024-02-28", "2024-03-01")).toBe(2);
    expect(nightsBetween("2025-02-28", "2025-03-01")).toBe(1);
  });

  it("validates calendar dates strictly", () => {
    expect(isValidCalendarDate("2026-06-15")).toBe(true);
    expect(isValidCalendarDate("2026-02-29")).toBe(false);
    expect(isValidCalendarDate("2026-04-31")).toBe(false);
    expect(isValidCalendarDate("2026-13-01")).toBe(false);
    expect(isValidCalendarDate("06-15-2026")).toBe(false);
  });
});

describe("ALLOWED_BOOKING_TRANSITIONS", () => {
  it("allows only contract-defined booking status transitions", () => {
    expect(ALLOWED_BOOKING_TRANSITIONS.pending).toEqual(["confirmed", "cancelled"]);
    expect(canTransitionBookingStatus("pending", "confirmed")).toBe(true);
    expect(canTransitionBookingStatus("confirmed", "checked_in")).toBe(true);
    expect(canTransitionBookingStatus("checked_in", "checked_out")).toBe(true);
    expect(canTransitionBookingStatus("checked_in", "cancelled")).toBe(false);
    expect(canTransitionBookingStatus("cancelled", "confirmed")).toBe(false);
  });
});
