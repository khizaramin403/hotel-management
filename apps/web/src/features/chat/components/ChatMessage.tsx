"use client";

import { memo } from "react";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { formatChatTime, type MessageDeliveryStatus } from "../lib/chatFormat";

export interface ChatMessageProps {
  messageId: number;
  text: string;
  createdAt: string;
  isOwn: boolean;
  senderLabel: string;
  datePillLabel?: string;
  isGroupedWithPrevious: boolean;
  showTimestamp: boolean;
  deliveryStatus?: MessageDeliveryStatus;
  clientId?: string;
  onRetry?: (clientId: string) => void;
}

export const ChatMessage = memo(function ChatMessage({
  messageId,
  text,
  createdAt,
  isOwn,
  senderLabel,
  datePillLabel,
  isGroupedWithPrevious,
  showTimestamp,
  deliveryStatus,
  clientId,
  onRetry,
}: ChatMessageProps) {
  const spacingClass = datePillLabel
    ? "pt-4"
    : isGroupedWithPrevious
      ? "pt-1"
      : "pt-4";

  const bubbleClass = isOwn
    ? "bg-green-600 text-neutral-0 rounded-lg rounded-br-sm"
    : "border border-line bg-neutral-0 text-ink rounded-lg rounded-bl-sm";

  const statusAlignmentClass = isOwn ? "items-end" : "items-start";
  const timeText = formatChatTime(createdAt);

  return (
    <div data-message-id={messageId} className={spacingClass}>
      {datePillLabel ? (
        <div className="mb-3 flex justify-center">
          <span className="rounded-full bg-neutral-100 px-3 py-0.5 font-sans text-[12px] leading-[18px] text-muted">
            {datePillLabel}
          </span>
        </div>
      ) : null}

      <div className={`flex flex-col ${statusAlignmentClass}`}>
        <div
          className={`max-w-[70%] whitespace-pre-wrap break-words px-3 py-2 font-sans text-[14px] leading-[22px] ${bubbleClass} ${
            deliveryStatus === "sending" ? "opacity-75" : ""
          }`.trim()}
        >
          {text}
        </div>

        {deliveryStatus === "sending" ? (
          <span className="mt-1 font-sans text-[12px] leading-[18px] text-muted">
            Sending...
          </span>
        ) : deliveryStatus === "failed" ? (
          <div className="mt-1 flex items-center gap-2 font-sans text-[12px] leading-[18px] text-error">
            <span className="inline-flex items-center gap-1">
              <ExclamationCircleOutlined aria-hidden="true" />
              <span>Failed to send</span>
            </span>
            {clientId && onRetry ? (
              <Button
                type="link"
                size="small"
                className="!h-auto !min-h-[44px] !px-2 text-[12px] leading-[18px] md:!min-h-0 md:!p-0"
                onClick={() => onRetry(clientId)}
              >
                Retry
              </Button>
            ) : null}
          </div>
        ) : showTimestamp && timeText ? (
          <span className="mt-1 font-sans text-[12px] leading-[18px] text-muted">
            {senderLabel}, {timeText}
          </span>
        ) : null}
      </div>
    </div>
  );
});
