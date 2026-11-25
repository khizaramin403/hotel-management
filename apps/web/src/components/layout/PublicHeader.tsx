"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Drawer, Dropdown, Skeleton, Tooltip, type MenuProps } from "antd";
import { PUBLIC_NAV_ITEMS, getPostLoginHome } from "@/lib/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthStatus, selectAuthUser } from "@/store/slices/authSlice";
import { getUserInitials, performClientLogout } from "./layoutUtils";

function isPublicNavActive(route: string, pathname: string): boolean {
  if (route === "/") {
    return pathname === "/" || pathname.startsWith("/rooms/");
  }
  return pathname === route;
}

export function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const authStatus = useAppSelector(selectAuthStatus);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAuthPending = authStatus === "idle" || authStatus === "loading";

  const handleLogout = async () => {
    setDrawerOpen(false);
    await performClientLogout(dispatch);
    router.push("/");
  };

  const dropdownItems: MenuProps["items"] = user
    ? [
        ...(user.role === "guest"
          ? [
              {
                key: "my-bookings",
                icon: <CalendarOutlined aria-hidden="true" />,
                label: <Link href="/my-bookings">My bookings</Link>,
              },
              {
                key: "chat",
                icon: <MessageOutlined aria-hidden="true" />,
                label: <Link href="/chat">Chat</Link>,
              },
            ]
          : [
              {
                key: "dashboard",
                icon: <DashboardOutlined aria-hidden="true" />,
                label: <Link href={getPostLoginHome(user.role)}>Dashboard</Link>,
              },
            ]),
        { type: "divider" as const },
        {
          key: "logout",
          icon: <LogoutOutlined aria-hidden="true" />,
          label: "Log out",
          onClick: () => {
            void handleLogout();
          },
        },
      ]
    : [];

  return (
    <header className="h-16 border-b border-line bg-neutral-0">
      <div className="mx-auto flex h-full max-w-container items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="font-serif text-[22px] font-semibold leading-[28px] tracking-[-0.01em] text-ink no-underline"
          >
            Grand Hotel
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
            {PUBLIC_NAV_ITEMS.map((item) => {
              const active = isPublicNavActive(item.route, pathname);
              return (
                <Link
                  key={item.route}
                  href={item.route}
                  aria-current={active ? "page" : undefined}
                  className={`border-b-2 py-1 font-sans text-[14px] font-medium leading-[22px] no-underline transition-colors ${
                    active
                      ? "border-green-600 text-green-600"
                      : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isAuthPending ? (
            <Skeleton.Button active size="small" />
          ) : user ? (
            <Dropdown menu={{ items: dropdownItems }} trigger={["click"]} placement="bottomRight">
              <button
                type="button"
                aria-label="Account menu"
                className="flex min-h-[40px] cursor-pointer items-center gap-2 rounded-md border border-transparent bg-transparent px-2 py-1 text-left transition-colors hover:bg-green-50"
              >
                <Avatar
                  size={32}
                  className="bg-green-600 font-sans text-[13px] font-medium text-neutral-0"
                >
                  {getUserInitials(user.name)}
                </Avatar>
                <span className="hidden font-sans text-[14px] font-medium text-ink sm:inline">
                  {user.name}
                </span>
              </button>
            </Dropdown>
          ) : (
            <Button
              type="primary"
              size="small"
              className="hidden md:inline-flex"
              onClick={() => router.push("/login")}
            >
              Login
            </Button>
          )}

          <Tooltip title="Open navigation menu">
            <Button
              type="text"
              icon={<MenuOutlined className="text-[20px]" aria-hidden="true" />}
              aria-label="Open navigation menu"
              className="min-h-[44px] min-w-[44px] md:hidden"
              onClick={() => setDrawerOpen(true)}
            />
          </Tooltip>
        </div>
      </div>

      <Drawer
        title={<span className="font-serif text-[20px] font-semibold text-ink">Grand Hotel</span>}
        placement="right"
        width={280}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <nav aria-label="Mobile" className="flex flex-col gap-1">
          {PUBLIC_NAV_ITEMS.map((item) => {
            const active = isPublicNavActive(item.route, pathname);
            return (
              <Link
                key={item.route}
                href={item.route}
                aria-current={active ? "page" : undefined}
                onClick={() => setDrawerOpen(false)}
                className={`flex min-h-[44px] items-center rounded-md px-3 font-sans text-[14px] font-medium no-underline ${
                  active ? "bg-green-50 text-green-600" : "text-ink hover:bg-canvas"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <div className="my-3 border-t border-line" />

          {user ? (
            <>
              {user.role === "guest" ? (
                <>
                  <Link
                    href="/my-bookings"
                    onClick={() => setDrawerOpen(false)}
                    className="flex min-h-[44px] items-center gap-3 rounded-md px-3 font-sans text-[14px] font-medium text-ink no-underline hover:bg-canvas"
                  >
                    <CalendarOutlined aria-hidden="true" />
                    <span>My bookings</span>
                  </Link>
                  <Link
                    href="/chat"
                    onClick={() => setDrawerOpen(false)}
                    className="flex min-h-[44px] items-center gap-3 rounded-md px-3 font-sans text-[14px] font-medium text-ink no-underline hover:bg-canvas"
                  >
                    <MessageOutlined aria-hidden="true" />
                    <span>Chat</span>
                  </Link>
                </>
              ) : (
                <Link
                  href={getPostLoginHome(user.role)}
                  onClick={() => setDrawerOpen(false)}
                  className="flex min-h-[44px] items-center gap-3 rounded-md px-3 font-sans text-[14px] font-medium text-ink no-underline hover:bg-canvas"
                >
                  <DashboardOutlined aria-hidden="true" />
                  <span>Dashboard</span>
                </Link>
              )}
              <Button
                type="default"
                block
                className="mt-2 min-h-[44px]"
                icon={<LogoutOutlined aria-hidden="true" />}
                onClick={() => {
                  void handleLogout();
                }}
              >
                Log out
              </Button>
            </>
          ) : (
            <Button
              type="primary"
              block
              className="min-h-[44px]"
              onClick={() => {
                setDrawerOpen(false);
                router.push("/login");
              }}
            >
              Login
            </Button>
          )}
        </nav>
      </Drawer>
    </header>
  );
}
