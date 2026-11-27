import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";

export const MAX_NOTIFICATIONS = 10;

export type NotificationType =
  | "chat_message"
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_new";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface AddNotificationPayload {
  id: string;
  type: NotificationType;
  text: string;
  createdAt: string;
  read?: boolean;
}

export interface NotificationsState {
  items: NotificationItem[];
}

const initialState: NotificationsState = {
  items: [],
};

function compareNewestFirst(a: NotificationItem, b: NotificationItem): number {
  const aMs = Date.parse(a.createdAt);
  const bMs = Date.parse(b.createdAt);
  const aValid = !Number.isNaN(aMs);
  const bValid = !Number.isNaN(bMs);

  if (aValid && bValid && bMs !== aMs) {
    return bMs - aMs;
  }
  if (!aValid && bValid) {
    return 1;
  }
  if (aValid && !bValid) {
    return -1;
  }
  return 0;
}

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<AddNotificationPayload>) {
      if (state.items.some((item) => item.id === action.payload.id)) {
        return;
      }

      const nextItem: NotificationItem = {
        id: action.payload.id,
        type: action.payload.type,
        text: action.payload.text,
        createdAt: action.payload.createdAt,
        read: action.payload.read ?? false,
      };

      const nextItems = [nextItem, ...state.items];
      nextItems.sort(compareNewestFirst);
      state.items = nextItems.slice(0, MAX_NOTIFICATIONS);
    },
    markNotificationRead(state, action: PayloadAction<string>) {
      const target = state.items.find((item) => item.id === action.payload);
      if (target && !target.read) {
        target.read = true;
      }
    },
    markAllRead(state) {
      for (const item of state.items) {
        item.read = true;
      }
    },
    resetNotifications() {
      return initialState;
    },
  },
});

export const {
  addNotification,
  markNotificationRead,
  markAllRead,
  resetNotifications,
} = notificationsSlice.actions;

export const notificationsReducer = notificationsSlice.reducer;

export const selectNotifications = (state: { notifications: NotificationsState }) =>
  state.notifications.items;

export const selectUnreadNotificationCount = createSelector(
  [selectNotifications],
  (items) => items.reduce((count, item) => (item.read ? count : count + 1), 0),
);
