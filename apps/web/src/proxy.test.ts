import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "./proxy";

describe("proxy route protection", () => {
  it("matches protected route prefixes", () => {
    expect(config.matcher).toEqual([
      "/book/:path*",
      "/my-bookings/:path*",
      "/chat/:path*",
      "/dashboard/:path*",
    ]);
  });

  it("redirects to /login with next parameter when neither cookie exists", () => {
    const request = new NextRequest("http://localhost:3000/my-bookings?tab=upcoming");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fmy-bookings%3Ftab%3Dupcoming",
    );
  });

  it("redirects dashboard and booking paths when cookies are empty", () => {
    const request = new NextRequest("http://localhost:3000/dashboard/bookings", {
      headers: { cookie: "mock_role=" },
    });
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fdashboard%2Fbookings",
    );
  });

  it("allows request when mock_role cookie is present", () => {
    const request = new NextRequest("http://localhost:3000/book/1", {
      headers: { cookie: "mock_role=guest" },
    });
    const response = proxy(request);

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows request when access_token cookie is present", () => {
    const request = new NextRequest("http://localhost:3000/dashboard", {
      headers: { cookie: "access_token=signed-jwt-token" },
    });
    const response = proxy(request);

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
