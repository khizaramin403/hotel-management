import type { ServiceName } from "./env";

export interface GatewayRoute {
  prefix: string;
  service: ServiceName;
  ws?: boolean;
}

export const GATEWAY_ROUTES: readonly GatewayRoute[] = [
  { prefix: "/api/v1/auth", service: "auth" },
  { prefix: "/api/v1/rooms", service: "room" },
  { prefix: "/api/v1/bookings", service: "booking" },
  { prefix: "/api/v1/chat", service: "chat" },
  { prefix: "/api/v1/notifications", service: "notification" },
  { prefix: "/socket.io", service: "chat", ws: true },
] as const;

/** Extracts the URL pathname without query string or hash. */
export function extractPathname(rawUrl: string | undefined): string {
  if (!rawUrl) {
    return "/";
  }
  const queryIndex = rawUrl.indexOf("?");
  const withoutQuery = queryIndex === -1 ? rawUrl : rawUrl.slice(0, queryIndex);
  const hashIndex = withoutQuery.indexOf("#");
  return hashIndex === -1 ? withoutQuery : withoutQuery.slice(0, hashIndex);
}

/** Checks whether a pathname belongs to a prefix at a segment boundary. */
export function matchesRoutePrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Returns true for internal endpoints that must never be exposed through the gateway. */
export function isInternalPath(pathname: string): boolean {
  return pathname === "/internal" || pathname.startsWith("/internal/");
}

/** Resolves the matching gateway route for a request URL, returning null for blocked or unknown paths. */
export function matchGatewayRoute(rawUrl: string | undefined): GatewayRoute | null {
  const pathname = extractPathname(rawUrl);
  if (isInternalPath(pathname)) {
    return null;
  }
  for (const route of GATEWAY_ROUTES) {
    if (matchesRoutePrefix(pathname, route.prefix)) {
      return route;
    }
  }
  return null;
}
