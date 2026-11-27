"use client";

import type { Conversation } from "@hotel/shared";
import { Avatar, Skeleton } from "antd";
import { getUserInitials } from "@/components/layout/layoutUtils";
import { EmptyState, ErrorState } from "@/components/ui";
import { formatChatTime } from "../lib/chatFormat";

const SKELETON_CONVERSATIONS = [1, 2, 3, 4] as const;

export interface ConversationListProps {
  conversations: readonly Conversation[];
  selectedConversationId: number | null;
  unreadByConversation: Readonly<Record<number, number>>;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelectConversation: (conversationId: number) => void;
}

function ConversationListSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading conversations"
      className="divide-y divide-line"
    >
      {SKELETON_CONVERSATIONS.map((item) => (
        <div key={item} className="flex h-[72px] items-center gap-3 px-4">
          <Skeleton.Avatar active size={40} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton.Input active size="small" className="!h-4 !w-28" />
            <Skeleton.Input active size="small" className="!h-3.5 !w-44" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConversationList({
  conversations,
  selectedConversationId,
  unreadByConversation,
  isLoading,
  isError,
  onRetry,
  onSelectConversation,
}: ConversationListProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-neutral-0">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-4">
        <h2 className="m-0 font-sans text-[18px] font-semibold leading-[26px] text-ink">
          Messages
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <ConversationListSkeleton />
        ) : isError ? (
          <div className="p-4">
            <ErrorState
              variant="alert"
              title="Could not load conversations"
              description="Check your connection and try again."
              onRetry={onRetry}
            />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No open conversations"
              description="Guest conversations will appear here."
            />
          </div>
        ) : (
          <ul
            aria-label="Conversations"
            className="m-0 list-none divide-y divide-line p-0"
          >
            {conversations.map((conversation) => {
              const isSelected = conversation.id === selectedConversationId;
              const unreadCount = unreadByConversation[conversation.id] ?? conversation.unreadCount;
              const previewText = conversation.lastMessage?.text ?? "No messages yet";
              const timeText = conversation.lastMessage
                ? formatChatTime(conversation.lastMessage.createdAt)
                : "";

              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    aria-current={isSelected ? "true" : undefined}
                    onClick={() => onSelectConversation(conversation.id)}
                    className={`flex h-[72px] w-full cursor-pointer items-center gap-3 border-0 border-l-[3px] px-4 text-left transition-colors duration-[120ms] ${
                      isSelected
                        ? "border-l-green-600 bg-green-100"
                        : "border-l-transparent bg-neutral-0 hover:bg-canvas"
                    }`}
                  >
                    <Avatar
                      size={40}
                      className="shrink-0 bg-green-600 font-sans text-[14px] font-medium text-neutral-0"
                    >
                      {getUserInitials(conversation.guestName)}
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-sans text-[14px] font-semibold leading-[20px] text-ink">
                          {conversation.guestName}
                        </span>
                        {timeText ? (
                          <span className="shrink-0 font-sans text-[12px] leading-[18px] tabular text-muted">
                            {timeText}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate font-sans text-[13px] leading-[20px] text-muted">
                          {previewText}
                        </span>

                        {unreadCount > 0 ? (
                          <span
                            aria-label={`${unreadCount} unread messages`}
                            className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-green-600 px-1.5 font-sans text-[12px] font-medium leading-none tabular text-neutral-0"
                          >
                            {unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
