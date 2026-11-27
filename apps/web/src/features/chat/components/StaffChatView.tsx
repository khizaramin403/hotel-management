"use client";

import { useCallback, useEffect, useState } from "react";
import type { Conversation } from "@hotel/shared";
import { EmptyState } from "@/components/ui";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import {
  selectUnreadByConversation,
  setActiveConversation,
  setConversationUnread,
} from "@/store/slices/chatSlice";
import { useConversationsQuery } from "../hooks/useChatQueries";
import { ChatThread } from "./ChatThread";
import { ConversationList } from "./ConversationList";

export interface StaffChatViewProps {
  onCall?: (conversation: Conversation) => void;
}

const EMPTY_CONVERSATIONS: readonly Conversation[] = [];

export function StaffChatView({ onCall }: StaffChatViewProps) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const unreadByConversation = useAppSelector(selectUnreadByConversation);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);

  const conversationsQuery = useConversationsQuery();
  const conversations = conversationsQuery.data?.data ?? EMPTY_CONVERSATIONS;

  useEffect(() => {
    return () => {
      dispatch(setActiveConversation(null));
    };
  }, [dispatch]);

  // Seed initial API unread counts into Redux without overriding active or live-updated counters
  useEffect(() => {
    if (conversations.length === 0) {
      return;
    }

    const existingUnread = store.getState().chat.unreadByConversation;
    for (const conversation of conversations) {
      if (existingUnread[conversation.id] === undefined && conversation.id !== selectedConversationId) {
        dispatch(
          setConversationUnread({
            conversationId: conversation.id,
            count: conversation.unreadCount,
          }),
        );
      }
    }
  }, [conversations, dispatch, selectedConversationId, store]);

  const selectedConversation =
    selectedConversationId !== null
      ? conversations.find((conversation) => conversation.id === selectedConversationId) ?? null
      : null;

  const handleSelectConversation = useCallback((conversationId: number) => {
    setSelectedConversationId(conversationId);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedConversationId(null);
    dispatch(setActiveConversation(null));
  }, [dispatch]);

  const isLoading =
    conversationsQuery.isPending || (conversationsQuery.isFetching && !conversationsQuery.data);

  return (
    <section
      aria-label="Guest chat inbox"
      data-testid="staff-chat-layout"
      className="flex h-[calc(100dvh-128px)] min-h-[500px] max-h-[820px] overflow-hidden rounded-lg border border-line bg-neutral-0"
    >
      <div
        data-testid="conversation-list-pane"
        className={`${
          selectedConversation ? "hidden md:block" : "block w-full"
        } h-full border-line md:w-[320px] md:shrink-0 md:border-r`}
      >
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          unreadByConversation={unreadByConversation}
          isLoading={isLoading}
          isError={conversationsQuery.isError}
          onRetry={() => {
            void conversationsQuery.refetch();
          }}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      <div
        data-testid="chat-thread-pane"
        className={`${
          selectedConversation ? "flex w-full" : "hidden md:flex"
        } h-full min-w-0 flex-1 flex-col`}
      >
        {selectedConversation ? (
          <ChatThread
            key={selectedConversation.id}
            conversation={selectedConversation}
            peerName={selectedConversation.guestName}
            showBackButton
            onBack={handleBackToList}
            onCall={onCall}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-canvas p-6">
            <EmptyState
              title="Select a conversation"
              description="Choose a guest thread from the list to reply."
            />
          </div>
        )}
      </div>
    </section>
  );
}
