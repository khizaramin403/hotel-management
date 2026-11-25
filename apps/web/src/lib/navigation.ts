import type { AriaAttributes, ComponentType } from "react";
import {
  BarChartOutlined,
  CalendarOutlined,
  DashboardOutlined,
  HomeOutlined,
  MessageOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { Role } from "@hotel/shared";

export type NavIconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: AriaAttributes["aria-hidden"];
}>;

export interface DashboardNavItem {
  route: string;
  roles: readonly Role[];
  label: string;
  icon: NavIconComponent;
  section: "MANAGE";
}

export interface PublicNavItem {
  route: string;
  label: string;
}

export const PUBLIC_NAV_ITEMS: readonly PublicNavItem[] = [
  { route: "/", label: "Rooms" },
  { route: "/#facilities", label: "Facilities" },
  { route: "/#contact", label: "Contact" },
];

export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
  {
    route: "/dashboard",
    roles: ["admin"],
    label: "Dashboard",
    icon: DashboardOutlined,
    section: "MANAGE",
  },
  {
    route: "/dashboard/bookings",
    roles: ["staff", "admin"],
    label: "Bookings",
    icon: CalendarOutlined,
    section: "MANAGE",
  },
  {
    route: "/dashboard/rooms",
    roles: ["admin"],
    label: "Rooms",
    icon: HomeOutlined,
    section: "MANAGE",
  },
  {
    route: "/dashboard/staff",
    roles: ["admin"],
    label: "Staff",
    icon: TeamOutlined,
    section: "MANAGE",
  },
  {
    route: "/dashboard/reports",
    roles: ["admin"],
    label: "Reports",
    icon: BarChartOutlined,
    section: "MANAGE",
  },
  {
    route: "/dashboard/chat",
    roles: ["staff", "admin"],
    label: "Chat",
    icon: MessageOutlined,
    section: "MANAGE",
  },
];

export function getDashboardNavItems(role: Role | null | undefined): DashboardNavItem[] {
  if (!role) {
    return [];
  }
  return DASHBOARD_NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function matchDashboardNavItem(pathname: string): DashboardNavItem | undefined {
  const subRouteMatch = DASHBOARD_NAV_ITEMS.find(
    (item) =>
      item.route !== "/dashboard" &&
      (pathname === item.route || pathname.startsWith(`${item.route}/`)),
  );
  if (subRouteMatch) {
    return subRouteMatch;
  }
  if (pathname === "/dashboard") {
    return DASHBOARD_NAV_ITEMS.find((item) => item.route === "/dashboard");
  }
  return undefined;
}

export function getDashboardPageTitle(pathname: string): string {
  return matchDashboardNavItem(pathname)?.label ?? "Dashboard";
}

export function isDashboardRouteAllowed(pathname: string, role: Role | null | undefined): boolean {
  if (!role || (role !== "staff" && role !== "admin")) {
    return false;
  }
  const matched = matchDashboardNavItem(pathname);
  if (!matched) {
    return true;
  }
  return matched.roles.includes(role);
}

export function getPostLoginHome(role: Role): string {
  if (role === "admin") {
    return "/dashboard";
  }
  if (role === "staff") {
    return "/dashboard/bookings";
  }
  return "/";
}
