import type { Message } from "@hotel/shared";
import { formatDate } from "@/lib/format";

export const MESSAGE_GROUP_WINDOW_MS = 2 * 60 * 1000;

export type MessageDeliveryStatus = "sending" | "failed";

export interface ThreadMessageItem extends Message {
  clientId?: string;
  deliveryStatus?: MessageDeliveryStatus;
}

export interface GroupedThreadItem {
  message: ThreadMessageItem;
  showDatePill: boolean;
  datePillLabel: string;
  isGroupedWithPrevious: boolean;
  isGroupedWithNext: boolean;
  showTimestamp: boolean;
}

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toLocalDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseTimestamp(isoTimestamp: string): Date | null {
  const ms = Date.parse(isoTimestamp);
  if (Number.isNaN(ms)) {
    return null;
  }
  return new Date(ms);
}

/** Formats an ISO timestamp into 24-hour HH:mm display time. */
export function formatChatTime(isoTimestamp: string): string {
  const parsed = parseTimestamp(isoTimestamp);
  if (!parsed) {
    return "";
  }
  return timeFormatter.format(parsed);
}

/** Returns 'Today', 'Yesterday', or a short calendar date label for thread date divider pills. */
export function formatChatDatePill(isoTimestamp: string, now: Date = new Date()): string {
  const parsed = parseTimestamp(isoTimestamp);
  if (!parsed) {
    return "";
  }

  const dayKey = toLocalDayKey(parsed);
  const todayKey = toLocalDayKey(now);
  if (dayKey === todayKey) {
    return "Today";
  }

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayKey === toLocalDayKey(yesterday)) {
    return "Yesterday";
  }

  return formatDate(dayKey);
}

function canGroupPair(first: ThreadMessageItem, second: ThreadMessageItem): boolean {
  if (first.deliveryStatus === "failed" || second.deliveryStatus === "failed") {
    return false;
  }
  if (first.senderId !== second.senderId || first.senderRole !== second.senderRole) {
    return false;
  }

  const firstDate = parseTimestamp(first.createdAt);
  const secondDate = parseTimestamp(second.createdAt);
  if (!firstDate || !secondDate) {
    return false;
  }

  if (toLocalDayKey(firstDate) !== toLocalDayKey(secondDate)) {
    return false;
  }

  return Math.abs(secondDate.getTime() - firstDate.getTime()) <= MESSAGE_GROUP_WINDOW_MS;
}

/**
 * Annotates chronological (oldest -> newest) messages with date divider pills and 2-minute
 * same-sender grouping metadata so timestamps render only at the end of each group.
 */
export function groupChatMessages(
  messages: readonly ThreadMessageItem[],
  now: Date = new Date(),
): GroupedThreadItem[] {
  return messages.map((message, index) => {
    const previous = index > 0 ? messages[index - 1] : undefined;
    const next = index < messages.length - 1 ? messages[index + 1] : undefined;

    const currentDate = parseTimestamp(message.createdAt);
    const previousDate = previous ? parseTimestamp(previous.createdAt) : undefined;
    const isSameDayAsPrevious =
      Boolean(currentDate && previousDate) &&
      toLocalDayKey(currentDate!) === toLocalDayKey(previousDate!);

    const showDatePill = !previous || !isSameDayAsPrevious;
    const isGroupedWithPrevious = previous ? canGroupPair(previous, message) : false;
    const isGroupedWithNext = next ? canGroupPair(message, next) : false;

    return {
      message,
      showDatePill,
      datePillLabel: showDatePill ? formatChatDatePill(message.createdAt, now) : "",
      isGroupedWithPrevious,
      isGroupedWithNext,
      showTimestamp: !isGroupedWithNext,
    };
  });
}
