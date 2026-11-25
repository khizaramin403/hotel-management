import { describe, expect, it } from "vitest";
import {
  DASHBOARD_NAV_ITEMS,
  getDashboardNavItems,
  getDashboardPageTitle,
  getPostLoginHome,
  isDashboardRouteAllowed,
  matchDashboardNavItem,
  resolvePostLoginRedirect,
} from "./navigation";

describe("navigation config", () => {
  it("returns all dashboard routes for admin in sidebar order", () => {
    const items = getDashboardNavItems("admin");
    expect(items.map((item) => item.route)).toEqual([
      "/dashboard",
      "/dashboard/bookings",
      "/dashboard/rooms",
      "/dashboard/staff",
      "/dashboard/reports",
      "/dashboard/chat",
    ]);
    for (const item of items) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.icon).toBeDefined();
    }
  });

  it("returns only staff-permitted routes for staff", () => {
    const items = getDashboardNavItems("staff");
    expect(items.map((item) => item.route)).toEqual(["/dashboard/bookings", "/dashboard/chat"]);
    expect(items.map((item) => item.label)).toEqual(["Bookings", "Chat"]);
  });

  it("returns no dashboard routes for guest or missing role", () => {
    expect(getDashboardNavItems("guest")).toEqual([]);
    expect(getDashboardNavItems(null)).toEqual([]);
    expect(getDashboardNavItems(undefined)).toEqual([]);
  });

  it("keeps a single canonical menu item per route", () => {
    const routes = DASHBOARD_NAV_ITEMS.map((item) => item.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("enforces dashboard route permissions per role", () => {
    expect(isDashboardRouteAllowed("/dashboard", "admin")).toBe(true);
    expect(isDashboardRouteAllowed("/dashboard/rooms", "admin")).toBe(true);
    expect(isDashboardRouteAllowed("/dashboard/staff", "admin")).toBe(true);
    expect(isDashboardRouteAllowed("/dashboard/reports", "admin")).toBe(true);
    expect(isDashboardRouteAllowed("/dashboard/bookings", "admin")).toBe(true);
    expect(isDashboardRouteAllowed("/dashboard/chat", "admin")).toBe(true);

    expect(isDashboardRouteAllowed("/dashboard", "staff")).toBe(false);
    expect(isDashboardRouteAllowed("/dashboard/rooms", "staff")).toBe(false);
    expect(isDashboardRouteAllowed("/dashboard/staff", "staff")).toBe(false);
    expect(isDashboardRouteAllowed("/dashboard/reports", "staff")).toBe(false);
    expect(isDashboardRouteAllowed("/dashboard/bookings", "staff")).toBe(true);
    expect(isDashboardRouteAllowed("/dashboard/bookings/42", "staff")).toBe(true);
    expect(isDashboardRouteAllowed("/dashboard/chat", "staff")).toBe(true);

    expect(isDashboardRouteAllowed("/dashboard", "guest")).toBe(false);
    expect(isDashboardRouteAllowed("/dashboard/bookings", "guest")).toBe(false);
    expect(isDashboardRouteAllowed("/dashboard", null)).toBe(false);
  });

  it("resolves active nav item and page title from pathname", () => {
    expect(matchDashboardNavItem("/dashboard")?.route).toBe("/dashboard");
    expect(matchDashboardNavItem("/dashboard/bookings/99")?.route).toBe("/dashboard/bookings");
    expect(getDashboardPageTitle("/dashboard")).toBe("Dashboard");
    expect(getDashboardPageTitle("/dashboard/rooms")).toBe("Rooms");
    expect(getDashboardPageTitle("/dashboard/staff")).toBe("Staff");
    expect(getDashboardPageTitle("/dashboard/reports")).toBe("Reports");
    expect(getDashboardPageTitle("/dashboard/bookings")).toBe("Bookings");
    expect(getDashboardPageTitle("/dashboard/chat")).toBe("Chat");
  });

  it("returns post-login landing routes by role", () => {
    expect(getPostLoginHome("admin")).toBe("/dashboard");
    expect(getPostLoginHome("staff")).toBe("/dashboard/bookings");
    expect(getPostLoginHome("guest")).toBe("/");
  });

  it("resolves next redirect safely based on user role", () => {
    expect(resolvePostLoginRedirect("guest", "/book/2?nights=2")).toBe("/book/2?nights=2");
    expect(resolvePostLoginRedirect("guest", "/dashboard")).toBe("/");
    expect(resolvePostLoginRedirect("guest", "https://evil.com")).toBe("/");
    expect(resolvePostLoginRedirect("guest", "//evil.com")).toBe("/");

    expect(resolvePostLoginRedirect("staff", "/dashboard/chat")).toBe("/dashboard/chat");
    expect(resolvePostLoginRedirect("staff", "/dashboard/rooms")).toBe("/dashboard/bookings");
    expect(resolvePostLoginRedirect("staff", "/my-bookings")).toBe("/dashboard/bookings");

    expect(resolvePostLoginRedirect("admin", "/dashboard/rooms")).toBe("/dashboard/rooms");
    expect(resolvePostLoginRedirect("admin", "/login")).toBe("/dashboard");
  });
});
