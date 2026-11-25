"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Badge,
  Button,
  Drawer,
  Dropdown,
  Layout,
  Menu,
  Tooltip,
  type MenuProps,
} from "antd";
import {
  getDashboardNavItems,
  getDashboardPageTitle,
  matchDashboardNavItem,
} from "@/lib/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/slices/authSlice";
import {
  selectMobileMenuOpen,
  selectSidebarCollapsed,
  setMobileMenuOpen,
  toggleSidebar,
} from "@/store/slices/uiSlice";
import { getUserInitials, performClientLogout } from "./layoutUtils";

const { Sider, Header, Content } = Layout;

export interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const sidebarCollapsed = useAppSelector(selectSidebarCollapsed);
  const mobileMenuOpen = useAppSelector(selectMobileMenuOpen);

  const navItems = getDashboardNavItems(user?.role);
  const matchedItem = matchDashboardNavItem(pathname);
  const selectedKeys = matchedItem ? [matchedItem.route] : [];
  const pageTitle = getDashboardPageTitle(pathname);

  const menuItems: MenuProps["items"] = navItems.map((item) => {
    const Icon = item.icon;
    return {
      key: item.route,
      icon: <Icon className="text-[20px]" aria-hidden="true" />,
      label: <Link href={item.route}>{item.label}</Link>,
      title: item.label,
    };
  });

  const handleLogout = async () => {
    dispatch(setMobileMenuOpen(false));
    await performClientLogout(dispatch);
    router.push("/login");
  };

  const avatarMenuItems: MenuProps["items"] = [
    {
      key: "hotel",
      icon: <HomeOutlined aria-hidden="true" />,
      label: <Link href="/">Public site</Link>,
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined aria-hidden="true" />,
      label: "Log out",
      onClick: () => {
        void handleLogout();
      },
    },
  ];

  const renderBrandHeader = (collapsed: boolean) => (
    <div
      className={`flex h-16 items-center border-b border-green-700 px-4 ${
        collapsed ? "justify-center" : "justify-start"
      }`}
    >
      <Tooltip title={collapsed ? "Grand Hotel" : undefined} placement="right">
        <Link
          href={navItems[0]?.route ?? "/dashboard"}
          className="font-serif text-[20px] font-semibold leading-[28px] tracking-[-0.01em] text-neutral-0 no-underline"
        >
          {collapsed ? "GH" : "Grand Hotel"}
        </Link>
      </Tooltip>
    </div>
  );

  const renderSidebarNav = (collapsed: boolean, onNavigate?: () => void) => (
    <div>
      {!collapsed && navItems.length > 0 ? (
        <div className="px-6 pt-5 pb-2 font-sans text-[12px] font-semibold uppercase tracking-[0.06em] text-green-300">
          {navItems[0].section}
        </div>
      ) : null}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={selectedKeys}
        items={menuItems}
        onClick={onNavigate}
        className="dashboard-sidebar-menu border-inline-end-0"
      />
    </div>
  );

  return (
    <Layout className="min-h-screen bg-canvas">
      <Sider
        width={240}
        collapsedWidth={72}
        collapsible
        collapsed={sidebarCollapsed}
        trigger={null}
        className="hidden lg:block"
      >
        {renderBrandHeader(sidebarCollapsed)}
        {renderSidebarNav(sidebarCollapsed)}
      </Sider>

      <Drawer
        placement="left"
        width={280}
        open={mobileMenuOpen}
        onClose={() => dispatch(setMobileMenuOpen(false))}
        title={
          <span className="font-serif text-[20px] font-semibold text-neutral-0">Grand Hotel</span>
        }
        rootClassName="dashboard-nav-drawer"
        styles={{ body: { padding: 0 } }}
      >
        {renderSidebarNav(false, () => dispatch(setMobileMenuOpen(false)))}
      </Drawer>

      <Layout className="min-w-0 bg-canvas">
        <Header className="flex h-16 items-center justify-between border-b border-line !px-4 lg:!px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Tooltip title="Open navigation menu">
              <Button
                type="text"
                icon={<MenuOutlined className="text-[18px]" aria-hidden="true" />}
                aria-label="Open navigation menu"
                className="min-h-[44px] min-w-[44px] lg:hidden"
                onClick={() => dispatch(setMobileMenuOpen(true))}
              />
            </Tooltip>

            <Tooltip title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
              <Button
                type="text"
                icon={
                  sidebarCollapsed ? (
                    <MenuUnfoldOutlined className="text-[18px]" aria-hidden="true" />
                  ) : (
                    <MenuFoldOutlined className="text-[18px]" aria-hidden="true" />
                  )
                }
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="hidden min-h-[40px] min-w-[40px] lg:inline-flex"
                onClick={() => dispatch(toggleSidebar())}
              />
            </Tooltip>

            <h3 className="m-0 truncate font-serif text-[20px] font-medium leading-[28px] text-ink md:text-[22px] md:leading-[30px]">
              {pageTitle}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <Tooltip title="Notifications">
              <Badge dot={false}>
                <Button
                  type="text"
                  icon={<BellOutlined className="text-[18px]" aria-hidden="true" />}
                  aria-label="Notifications"
                  className="min-h-[40px] min-w-[40px]"
                />
              </Badge>
            </Tooltip>

            {user ? (
              <Dropdown
                menu={{ items: avatarMenuItems }}
                trigger={["click"]}
                placement="bottomRight"
              >
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
            ) : null}
          </div>
        </Header>

        <Content className="min-w-0 flex-1 bg-canvas">
          <div className="mx-auto w-full max-w-[1440px] p-4 lg:p-6">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
