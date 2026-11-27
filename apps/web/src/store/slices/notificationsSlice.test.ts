import { describe, expect, it } from "vitest";
import { makeStore } from "../index";
import {
  addNotification,
  MAX_NOTIFICATIONS,
  markAllRead,
  markNotificationRead,
  notificationsReducer,
  resetNotifications,
  selectNotifications,
  selectUnreadNotificationCount,
} from "./notificationsSlice";

describe("notificationsSlice", () => {
  it("adds items newest first, deduplicates by id, and caps the list at 10 items", () => {
    const store = makeStore();
    expect(selectNotifications(store.getState())).toEqual([]);
    expect(selectUnreadNotificationCount(store.getState())).toBe(0);

    for (let i = 1; i <= MAX_NOTIFICATIONS + 2; i += 1) {
      const minute = String(i).padStart(2, "0");
      store.dispatch(
        addNotification({
          id: `n-${i}`,
          type: "chat_message",
          text: `Notification ${i}`,
          createdAt: `2026-11-27T10:${minute}:00.000Z`,
        }),
      );
    }

    // Duplicate id should be ignored cleanly
    store.dispatch(
      addNotification({
        id: "n-12",
        type: "chat_message",
        text: "Duplicate Notification 12",
        createdAt: "2026-11-27T11:00:00.000Z",
      }),
    );

    const items = selectNotifications(store.getState());
    expect(items).toHaveLength(MAX_NOTIFICATIONS);
    expect(items[0]).toEqual({
      id: "n-12",
      type: "chat_message",
      text: "Notification 12",
      createdAt: "2026-11-27T10:12:00.000Z",
      read: false,
    });
    expect(items[MAX_NOTIFICATIONS - 1]?.id).toBe("n-3");
    expect(selectUnreadNotificationCount(store.getState())).toBe(MAX_NOTIFICATIONS);
  });

  it("sorts older-timestamp items behind newer ones and preserves newest-first on equal timestamps", () => {
    let state = notificationsReducer(undefined, { type: "unknown" });

    state = notificationsReducer(
      state,
      addNotification({
        id: "later",
        type: "booking_confirmed",
        text: "Confirmed booking",
        createdAt: "2026-11-27T12:00:00.000Z",
      }),
    );
    state = notificationsReducer(
      state,
      addNotification({
        id: "older",
        type: "booking_cancelled",
        text: "Cancelled booking",
        createdAt: "2026-11-27T09:00:00.000Z",
      }),
    );
    state = notificationsReducer(
      state,
      addNotification({
        id: "equal-newer",
        type: "booking_new",
        text: "New booking",
        createdAt: "2026-11-27T12:00:00.000Z",
      }),
    );

    expect(selectNotifications({ notifications: state }).map((item) => item.id)).toEqual([
      "equal-newer",
      "later",
      "older",
    ]);
  });

  it("marks individual and all notifications as read and resets on logout", () => {
    const store = makeStore();

    store.dispatch(
      addNotification({
        id: "b-1",
        type: "booking_confirmed",
        text: "Booking BK-101 confirmed.",
        createdAt: "2026-11-27T10:00:00.000Z",
      }),
    );
    store.dispatch(
      addNotification({
        id: "b-2",
        type: "booking_cancelled",
        text: "Booking BK-102 cancelled.",
        createdAt: "2026-11-27T10:05:00.000Z",
      }),
    );

    expect(selectUnreadNotificationCount(store.getState())).toBe(2);

    store.dispatch(markNotificationRead("b-1"));
    expect(selectUnreadNotificationCount(store.getState())).toBe(1);

    store.dispatch(markAllRead());
    expect(selectUnreadNotificationCount(store.getState())).toBe(0);
    expect(selectNotifications(store.getState()).every((item) => item.read)).toBe(true);

    store.dispatch(resetNotifications());
    expect(selectNotifications(store.getState())).toEqual([]);
  });
});
