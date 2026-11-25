import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const hasAccessToken = Boolean(request.cookies.get("access_token")?.value);
  const hasMockRole = Boolean(request.cookies.get("mock_role")?.value);

  if (hasAccessToken || hasMockRole) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/book/:path*", "/my-bookings/:path*", "/chat/:path*", "/dashboard/:path*"],
};
