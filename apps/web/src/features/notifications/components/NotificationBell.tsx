"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  BellOutlined,
  CalendarOutlined,
  InboxOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { Badge, Button, Dropdown, Empty, Tooltip } from "antd";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  markAllRead,
  markNotificationRead,
  MAX_NOTIFICATIONS,
  selectNotifications,
  selectUnreadNotificationCount,
  type NotificationItem,
} from "@/store/slices/notificationsSlice";
import { formatNotificationTime, getNotificationHref } from "../lib/bookingNotifications";

function NotificationTypeIcon({ type, unread }: { type: NotificationItem["type"]; unread: boolean }) {
  const colorClass = unread ? "text-green-600" : "text-muted";
  if (type === "chat_message") {
    return <MessageOutlined className={`mt-0.5 shrink-0 text-[16px] ${colorClass}`} aria-hidden="true" />;
  }
  return <CalendarOutlined className={`mt-0.5 shrink-0 text-[16px] ${colorClass}`} aria-hidden="true" />;
}

export function NotificationBell() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectNotifications);
  const unreadCount = useAppSelector(selectUnreadNotificationCount);
  const userRole = useAppSelector((state) => state.auth.user?.role ?? null);

  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const visibleItems = items.slice(0, MAX_NOTIFICATIONS);

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) {
        return;
      }
      const firstFocusable = panel.querySelector<HTMLButtonElement>("button:not(:disabled)");
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        panel.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [open]);

  const closeAndRestoreFocus = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }, []);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
  }, []);

  const handleTriggerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (!open && (event.key === "ArrowDown" || event.key === "Down")) {
        event.preventDefault();
        setOpen(true);
      } else if (open && event.key === "Escape") {
        event.preventDefault();
        closeAndRestoreFocus();
      }
    },
    [closeAndRestoreFocus, open],
  );

  const handlePanelKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeAndRestoreFocus();
        return;
      }

      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const buttons = Array.from(
        panel.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
      );
      if (buttons.length === 0) {
        return;
      }

      event.preventDefault();
      const activeIndex = buttons.findIndex((button) => button === document.activeElement);
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        activeIndex === -1
          ? event.key === "ArrowDown"
            ? 0
            : buttons.length - 1
          : (activeIndex + delta + buttons.length) % buttons.length;

      buttons[nextIndex]?.focus();
    },
    [closeAndRestoreFocus],
  );

  const handleItemActivate = useCallback(
    (item: NotificationItem) => {
      dispatch(markNotificationRead(item.id));
      setOpen(false);
      const targetHref = getNotificationHref(item.type, userRole);
      if (targetHref) {
        router.push(targetHref);
      }
    },
    [dispatch, router, userRole],
  );

  const ariaLabel = unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications";

  const dropdownPanel = (
    <div
      id={panelId}
      ref={panelRef}
      tabIndex={-1}
      role="region"
      aria-label="Notifications"
      onKeyDown={handlePanelKeyDown}
      className="w-[320px] max-w-[calc(100vw-32px)] overflow-hidden rounded-md border border-line bg-neutral-0 shadow-e1 focus:outline-none"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="font-sans text-[14px] font-semibold leading-[20px] text-ink">
          Notifications
        </span>
        <Button
          type="text"
          size="small"
          disabled={unreadCount === 0}
          onClick={() => dispatch(markAllRead())}
          className="!px-2"
        >
          Mark all read
        </Button>
      </div>

      {visibleItems.length === 0 ? (
        <div className="px-4 py-6">
          <Empty
            image={<InboxOutlined className="text-[36px] text-muted" aria-hidden="true" />}
            description={
              <span className="font-sans text-[14px] leading-[22px] text-muted">
                No notifications
              </span>
            }
          />
        </div>
      ) : (
        <ul
          aria-label="Notification items"
          className="m-0 max-h-[360px] list-none divide-y divide-line overflow-y-auto p-0"
        >
          {visibleItems.map((item) => {
            const timeLabel = formatNotificationTime(item.createdAt);
            const unread = !item.read;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleItemActivate(item)}
                  className={`flex w-full cursor-pointer items-start gap-3 border-0 px-4 py-3 text-left transition-colors duration-[120ms] hover:bg-canvas ${
                    unread ? "bg-green-50" : "bg-neutral-0"
                  }`}
                >
                  <NotificationTypeIcon type={item.type} unread={unread} />

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div
                      className={`font-sans text-[14px] leading-[20px] ${
                        unread ? "font-medium text-ink" : "font-normal text-muted"
                      }`}
                    >
                      {item.text}
                    </div>
                    {timeLabel ? (
                      <div className="font-sans text-[12px] leading-[18px] text-muted tabular">
                        {timeLabel}
                      </div>
                    ) : null}
                  </div>

                  {unread ? (
                    <span
                      className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-green-600"
                      aria-hidden="true"
                    />
                  ) : null}
                  {unread ? <span className="sr-only">Unread</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={handleOpenChange}
      trigger={["click"]}
      placement="bottomRight"
      destroyOnHidden
      popupRender={() => dropdownPanel}
    >
      <Tooltip title={open ? undefined : "Notifications"}>
        <Button
          ref={triggerRef}
          type="text"
          aria-label={ariaLabel}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onKeyDown={handleTriggerKeyDown}
          icon={
            <Badge
              count={unreadCount}
              overflowCount={99}
              size="small"
              offset={[-2, 2]}
              className="notification-bell-badge"
            >
              <BellOutlined className="text-[24px] text-ink" aria-hidden="true" />
            </Badge>
          }
          className="min-h-[44px] min-w-[44px] md:min-h-[40px] md:min-w-[40px]"
        />
      </Tooltip>
    </Dropdown>
  );
}
