import { BOOKING_STATUSES, PAYMENT_STATUSES } from "@hotel/shared";
import { describe, expect, it } from "vitest";
import { BOOKING_STATUS_TAG_MAP, getStatusTagStyle, PAYMENT_STATUS_TAG_MAP } from "./statusTagMap";

describe("StatusTag mapping", () => {
  it("maps every booking status from @hotel/shared to its Tailwind token classes", () => {
    for (const status of BOOKING_STATUSES) {
      const style = BOOKING_STATUS_TAG_MAP[status];
      expect(style).toBeDefined();
      expect(style.label.length).toBeGreaterThan(0);
    }

    expect(getStatusTagStyle("pending", "booking")).toEqual({
      label: "Pending",
      bgClass: "bg-warning-bg",
      textClass: "text-warning-text",
      dotClass: "bg-warning",
    });
    expect(getStatusTagStyle("confirmed", "booking")).toEqual({
      label: "Confirmed",
      bgClass: "bg-success-bg",
      textClass: "text-success-text",
      dotClass: "bg-success",
    });
    expect(getStatusTagStyle("checked_in", "booking")).toEqual({
      label: "Checked in",
      bgClass: "bg-info-bg",
      textClass: "text-info",
      dotClass: "bg-info",
    });
    expect(getStatusTagStyle("checked_out", "booking")).toEqual({
      label: "Checked out",
      bgClass: "bg-neutral-100",
      textClass: "text-neutral-700",
      dotClass: "bg-neutral-400",
    });
    expect(getStatusTagStyle("cancelled", "booking")).toEqual({
      label: "Cancelled",
      bgClass: "bg-error-bg",
      textClass: "text-error",
      dotClass: "bg-error",
    });
  });

  it("maps every payment status from @hotel/shared to its Tailwind token classes", () => {
    for (const status of PAYMENT_STATUSES) {
      const style = PAYMENT_STATUS_TAG_MAP[status];
      expect(style).toBeDefined();
      expect(style.label.length).toBeGreaterThan(0);
    }

    expect(getStatusTagStyle("pending", "payment")).toEqual({
      label: "Pending",
      bgClass: "bg-warning-bg",
      textClass: "text-warning-text",
      dotClass: "bg-warning",
    });
    expect(getStatusTagStyle("paid", "payment")).toEqual({
      label: "Paid",
      bgClass: "bg-success-bg",
      textClass: "text-success-text",
      dotClass: "bg-success",
    });
    expect(getStatusTagStyle("failed", "payment")).toEqual({
      label: "Failed",
      bgClass: "bg-error-bg",
      textClass: "text-error",
      dotClass: "bg-error",
    });
    expect(getStatusTagStyle("refunded", "payment")).toEqual({
      label: "Refunded",
      bgClass: "bg-neutral-100",
      textClass: "text-neutral-700",
      dotClass: "bg-neutral-400",
    });
  });

  it("maps active and inactive room statuses to Tailwind token classes", () => {
    expect(getStatusTagStyle("active", "room")).toEqual({
      label: "Active",
      bgClass: "bg-success-bg",
      textClass: "text-success-text",
      dotClass: "bg-success",
    });
    expect(getStatusTagStyle("inactive", "room")).toEqual({
      label: "Inactive",
      bgClass: "bg-neutral-100",
      textClass: "text-neutral-700",
      dotClass: "bg-neutral-400",
    });
  });
});
