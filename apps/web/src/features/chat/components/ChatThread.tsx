"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowDownOutlined, ArrowLeftOutlined, PhoneOutlined } from "@ant-design/icons";
import type { Conversation, Message } from "@hotel/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Avatar, Button, Skeleton, Tooltip } from "antd";
import { getUserInitials } from "@/components/layout/layoutUtils";
import { EmptyState, ErrorState } from "@/components/ui";
import {
  clearConversationUnreadInCache,
  upsertMessageInCache,
  type ServerSocketHandler,
} from "@/lib/socket";
import { useSocket } from "@/providers/SocketProvider";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { selectAuthUser } from "@/store/slices/authSlice";
import { selectCallStatus } from "@/store/slices/callSlice";
import { setActiveConversation, type ChatSystemEvent } from "@/store/slices/chatSlice";
import {
  flattenChronologicalMessages,
  useConversationMessagesInfiniteQuery,
} from "../hooks/useChatQueries";
import { initiateOutgoingCall } from "../lib/callSignaling";
import { groupChatMessages, type GroupedThreadItem, type ThreadMessageItem } from "../lib/chatFormat";
import { ChatInputBar } from "./ChatInputBar";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicatorBubble } from "./TypingIndicatorBubble";

interface OptimisticEntry extends ThreadMessageItem {
  clientId: string;
  deliveryStatus: "sending" | "failed";
  confirmedId?: number;
}

type ThreadTimelineEntry =
  | {
      kind: "message";
      key: number;
      sortTimeMs: number;
      grouped: GroupedThreadItem;
    }
  | {
      kind: "system";
      key: string;
      sortTimeMs: number;
      text: string;
    };

const EMPTY_SYSTEM_EVENTS: readonly ChatSystemEvent[] = [];

export interface ChatThreadProps {
  conversation: Conversation;
  peerName: string;
  showBackButton?: boolean;
  onBack?: () => void;
  onCall?: (conversation: Conversation) => void;
}

function ChatThreadSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading messages"
      className="flex flex-1 flex-col justify-end gap-4 p-4 md:p-6"
    >
      <div className="flex justify-start">
        <Skeleton.Input active className="!h-11 !w-56 !rounded-lg" />
      </div>
      <div className="flex justify-end">
        <Skeleton.Input active className="!h-11 !w-64 !rounded-lg" />
      </div>
      <div className="flex justify-start">
        <Skeleton.Input active className="!h-14 !w-72 !rounded-lg" />
      </div>
    </div>
  );
}

export function ChatThread({
  conversation,
  peerName,
  showBackButton = false,
  onBack,
  onCall,
}: ChatThreadProps) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const queryClient = useQueryClient();
  const socket = useSocket();
  const currentUser = useAppSelector(selectAuthUser);
  const callStatus = useAppSelector(selectCallStatus);
  const isPeerTyping = useAppSelector((state) =>
    Boolean(state.chat.typingByConversation[conversation.id]),
  );
  const systemEvents = useAppSelector(
    (state) => state.chat.systemEventsByConversation[conversation.id] ?? EMPTY_SYSTEM_EVENTS,
  );

  const [optimisticEntries, setOptimisticEntries] = useState<OptimisticEntry[]>([]);
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);
  const [connectedSocket, setConnectedSocket] = useState<typeof socket>(null);

  const scrollParentRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const initialScrollDoneRef = useRef(false);
  const prevFirstKeyRef = useRef<string | number | null>(null);
  const prevLastKeyRef = useRef<string | number | null>(null);
  const prevScrollHeightRef = useRef(0);
  const optimisticSeqRef = useRef(0);

  const messagesQuery = useConversationMessagesInfiniteQuery(conversation.id);
  const pages = messagesQuery.data?.pages;

  const serverMessages = useMemo(() => flattenChronologicalMessages(pages), [pages]);

  const mergedMessages = useMemo<ThreadMessageItem[]>(() => {
    const serverIds = new Set(serverMessages.map((msg) => msg.id));
    const activeOptimistic = optimisticEntries.filter(
      (entry) => entry.confirmedId === undefined || !serverIds.has(entry.confirmedId),
    );
    return [...serverMessages, ...activeOptimistic];
  }, [optimisticEntries, serverMessages]);

  const groupedItems = useMemo(() => groupChatMessages(mergedMessages), [mergedMessages]);

  const timelineEntries = useMemo<ThreadTimelineEntry[]>(() => {
    if (systemEvents.length === 0) {
      return groupedItems.map((grouped) => ({
        kind: "message",
        key: grouped.message.id,
        sortTimeMs: Date.parse(grouped.message.createdAt) || 0,
        grouped,
      }));
    }

    const messageEntries: ThreadTimelineEntry[] = groupedItems.map((grouped) => ({
      kind: "message",
      key: grouped.message.id,
      sortTimeMs: Date.parse(grouped.message.createdAt) || 0,
      grouped,
    }));

    const systemEntries: ThreadTimelineEntry[] = systemEvents.map((event) => ({
      kind: "system",
      key: event.id,
      sortTimeMs: Date.parse(event.createdAt) || 0,
      text: event.text,
    }));

    return [...messageEntries, ...systemEntries].sort((a, b) => {
      if (a.sortTimeMs !== b.sortTimeMs) {
        return a.sortTimeMs - b.sortTimeMs;
      }
      if (a.kind !== b.kind) {
        return a.kind === "message" ? -1 : 1;
      }
      return 0;
    });
  }, [groupedItems, systemEvents]);

  // @tanstack/react-virtual exposes mutable measurement callbacks intentionally.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: timelineEntries.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 84,
    overscan: 8,
    initialRect: { width: 640, height: 480 },
    getItemKey: (index) => timelineEntries[index]?.key ?? index,
  });

  const isSocketConnected = socket !== null && (connectedSocket === socket || socket.isConnected());
  const currentUserId = currentUser?.id ?? 0;

  // Track reactive socket connectivity and incoming remote message pill while scrolled up
  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleConnect = () => setConnectedSocket(socket);
    const handleDisconnect = () => setConnectedSocket(null);
    const handleMessageNew: ServerSocketHandler<"message:new"> = (incoming) => {
      if (incoming.conversationId !== conversation.id) {
        return;
      }
      if (incoming.senderId !== currentUserId && !isNearBottomRef.current) {
        setHasNewMessagesBelow(true);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("message:new", handleMessageNew);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("message:new", handleMessageNew);
    };
  }, [conversation.id, currentUserId, socket]);

  // Opening a conversation clears its unread count locally and informs the server
  useEffect(() => {
    dispatch(setActiveConversation(conversation.id));
    clearConversationUnreadInCache(queryClient, conversation.id);

    if (!socket) {
      return;
    }

    const sendReadReceipt = () => {
      void socket.emit("conversation:read", { conversationId: conversation.id }).catch(() => {});
    };

    if (socket.isConnected()) {
      sendReadReceipt();
      return;
    }

    const handleConnect = () => {
      socket.off("connect", handleConnect);
      sendReadReceipt();
    };
    socket.on("connect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [conversation.id, dispatch, queryClient, socket]);

  const scrollToBottom = useCallback(() => {
    const scrollEl = scrollParentRef.current;
    if (timelineEntries.length > 0) {
      virtualizer.scrollToIndex(timelineEntries.length - 1, { align: "end" });
    }
    if (scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
    isNearBottomRef.current = true;
    setHasNewMessagesBelow(false);
  }, [timelineEntries.length, virtualizer]);

  useLayoutEffect(() => {
    const scrollEl = scrollParentRef.current;
    const firstKey = timelineEntries[0]?.key ?? null;
    const lastEntry = timelineEntries[timelineEntries.length - 1];
    const lastKey = lastEntry?.key ?? null;

    if (!initialScrollDoneRef.current && timelineEntries.length > 0) {
      initialScrollDoneRef.current = true;
      virtualizer.scrollToIndex(timelineEntries.length - 1, { align: "end" });
      if (scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight) {
        scrollEl.scrollTop = scrollEl.scrollHeight;
      }
      isNearBottomRef.current = true;
      prevFirstKeyRef.current = firstKey;
      prevLastKeyRef.current = lastKey;
      return;
    }

    // Preserve scroll anchor when older history pages prepend at top
    if (
      firstKey !== null &&
      prevFirstKeyRef.current !== null &&
      firstKey !== prevFirstKeyRef.current &&
      lastKey === prevLastKeyRef.current &&
      scrollEl &&
      prevScrollHeightRef.current > 0
    ) {
      const heightDelta = scrollEl.scrollHeight - prevScrollHeightRef.current;
      if (heightDelta > 0) {
        scrollEl.scrollTop += heightDelta;
      }
      prevScrollHeightRef.current = 0;
    } else if (lastKey !== null && lastKey !== prevLastKeyRef.current) {
      const isOwnLast =
        lastEntry?.kind === "message" && lastEntry.grouped.message.senderId === currentUserId;
      const isSystemLast = lastEntry?.kind === "system";
      if (isOwnLast || isSystemLast || isNearBottomRef.current) {
        virtualizer.scrollToIndex(timelineEntries.length - 1, { align: "end" });
        if (scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight) {
          scrollEl.scrollTop = scrollEl.scrollHeight;
        }
        isNearBottomRef.current = true;
      }
    }

    prevFirstKeyRef.current = firstKey;
    prevLastKeyRef.current = lastKey;
  }, [currentUserId, timelineEntries, virtualizer]);

  // Keep bottom aligned when typing indicator appears while near bottom
  useLayoutEffect(() => {
    if (!isPeerTyping || !isNearBottomRef.current) {
      return;
    }
    const scrollEl = scrollParentRef.current;
    if (scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
  }, [isPeerTyping]);

  const handleScroll = () => {
    const scrollEl = scrollParentRef.current;
    if (!scrollEl) {
      return;
    }

    const distanceFromBottom = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;
    const nearBottom = distanceFromBottom <= 120;
    isNearBottomRef.current = nearBottom;

    if (nearBottom && hasNewMessagesBelow) {
      setHasNewMessagesBelow(false);
    }

    if (
      scrollEl.scrollTop <= 80 &&
      messagesQuery.hasNextPage &&
      !messagesQuery.isFetchingNextPage
    ) {
      prevScrollHeightRef.current = scrollEl.scrollHeight;
      void messagesQuery.fetchNextPage();
    }
  };

  const deliverOptimisticMessage = useCallback(
    async (clientId: string, text: string) => {
      if (!socket) {
        setOptimisticEntries((prev) =>
          prev.map((entry) =>
            entry.clientId === clientId ? { ...entry, deliveryStatus: "failed" } : entry,
          ),
        );
        return;
      }

      try {
        const confirmed: Message = await socket.emit("message:send", {
          conversationId: conversation.id,
          text,
        });
        upsertMessageInCache(queryClient, confirmed);
        setOptimisticEntries((prev) =>
          prev.map((entry) =>
            entry.clientId === clientId ? { ...entry, confirmedId: confirmed.id } : entry,
          ),
        );
      } catch {
        setOptimisticEntries((prev) =>
          prev.map((entry) =>
            entry.clientId === clientId ? { ...entry, deliveryStatus: "failed" } : entry,
          ),
        );
      }
    },
    [conversation.id, queryClient, socket],
  );

  const handleSendMessage = useCallback(
    (text: string) => {
      optimisticSeqRef.current += 1;
      const seq = optimisticSeqRef.current;
      const clientId = `optimistic-${conversation.id}-${seq}`;

      const entry: OptimisticEntry = {
        id: -seq,
        clientId,
        conversationId: conversation.id,
        senderId: currentUserId,
        senderRole: currentUser?.role ?? "guest",
        text,
        createdAt: new Date().toISOString(),
        deliveryStatus: "sending",
      };

      setOptimisticEntries((prev) => [...prev, entry]);
      isNearBottomRef.current = true;
      setHasNewMessagesBelow(false);

      void deliverOptimisticMessage(clientId, text);
    },
    [conversation.id, currentUser?.role, currentUserId, deliverOptimisticMessage],
  );

  const handleRetryMessage = useCallback(
    (clientId: string) => {
      const target = optimisticEntries.find((entry) => entry.clientId === clientId);
      if (!target) {
        return;
      }

      setOptimisticEntries((prev) =>
        prev.map((entry) =>
          entry.clientId === clientId ? { ...entry, deliveryStatus: "sending" } : entry,
        ),
      );

      void deliverOptimisticMessage(clientId, target.text);
    },
    [deliverOptimisticMessage, optimisticEntries],
  );

  const handleTypingStart = useCallback(
    (convId: number) => {
      if (!socket?.isConnected()) {
        return;
      }
      void socket.emit("typing:start", { conversationId: convId }).catch(() => {});
    },
    [socket],
  );

  const handleTypingStop = useCallback(
    (convId: number) => {
      if (!socket?.isConnected()) {
        return;
      }
      void socket.emit("typing:stop", { conversationId: convId }).catch(() => {});
    },
    [socket],
  );

  const isLoadingInitial =
    messagesQuery.isPending || (messagesQuery.isFetching && !messagesQuery.data);

  return (
    <div
      data-testid="chat-thread"
      className="relative flex h-full min-h-0 flex-1 flex-col bg-neutral-0"
    >
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-neutral-0 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {showBackButton && onBack ? (
            <Tooltip title="Back to conversations">
              <Button
                type="text"
                icon={<ArrowLeftOutlined aria-hidden="true" />}
                aria-label="Back to conversations"
                className="!min-h-[44px] !min-w-[44px] md:hidden"
                onClick={onBack}
              />
            </Tooltip>
          ) : null}

          <Avatar
            size={40}
            className="shrink-0 bg-green-600 font-sans text-[14px] font-medium text-neutral-0"
          >
            {getUserInitials(peerName)}
          </Avatar>

          <div className="min-w-0">
            <div className="truncate font-sans text-[15px] font-semibold leading-[22px] text-ink">
              {peerName}
            </div>
            <div className="flex items-center gap-1.5 font-sans text-[12px] leading-[18px] text-muted">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${
                  isSocketConnected ? "bg-success" : "bg-neutral-400"
                }`}
              />
              <span>{isSocketConnected ? "Online" : "Offline"}</span>
            </div>
          </div>
        </div>

        <Button
          type="default"
          icon={<PhoneOutlined aria-hidden="true" />}
          disabled={!isSocketConnected || callStatus === "ringing" || callStatus === "connected"}
          onClick={() => {
            if (onCall) {
              onCall(conversation);
              return;
            }
            void initiateOutgoingCall({
              conversationId: conversation.id,
              peerName,
              dispatch,
              getState: store.getState,
              socket,
            });
          }}
        >
          Call
        </Button>
      </header>

      {socket && !isSocketConnected ? (
        <div
          role="status"
          className="border-b border-line bg-neutral-100 px-3 py-1.5 text-center font-sans text-[12px] leading-[18px] text-muted"
        >
          Reconnecting...
        </div>
      ) : null}

      {isLoadingInitial ? (
        <ChatThreadSkeleton />
      ) : messagesQuery.isError ? (
        <div className="flex flex-1 items-center justify-center p-4 md:p-6">
          <ErrorState
            variant="alert"
            title="Could not load messages"
            description="Check your connection and try again."
            onRetry={() => {
              void messagesQuery.refetch();
            }}
          />
        </div>
      ) : (
        <div
          ref={scrollParentRef}
          onScroll={handleScroll}
          role="log"
          aria-live="polite"
          aria-label="Conversation messages"
          data-testid="chat-messages-scroll"
          className="min-h-0 flex-1 overflow-y-auto bg-canvas px-4 py-4 md:px-6"
        >
          {timelineEntries.length === 0 && !isPeerTyping ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                title="No messages yet. Say hello."
                description="Send a message below to reach reception."
              />
            </div>
          ) : (
            <>
              {messagesQuery.isFetchingNextPage ? (
                <div className="pb-3 text-center font-sans text-[12px] leading-[18px] text-muted">
                  Loading older messages...
                </div>
              ) : null}

              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  position: "relative",
                  width: "100%",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const entry = timelineEntries[virtualRow.index];
                  if (!entry) {
                    return null;
                  }

                  return (
                    <div
                      key={entry.key}
                      ref={virtualizer.measureElement}
                      data-index={virtualRow.index}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {entry.kind === "system" ? (
                        <div className="flex justify-center pt-4" data-system-event-id={entry.key}>
                          <span className="rounded-full bg-neutral-100 px-3 py-0.5 font-sans text-[12px] leading-[18px] text-muted">
                            {entry.text}
                          </span>
                        </div>
                      ) : (
                        <ChatMessage
                          key={entry.grouped.message.id}
                          messageId={entry.grouped.message.id}
                          text={entry.grouped.message.text}
                          createdAt={entry.grouped.message.createdAt}
                          isOwn={entry.grouped.message.senderId === currentUserId}
                          senderLabel={
                            entry.grouped.message.senderId === currentUserId ? "You" : peerName
                          }
                          datePillLabel={
                            entry.grouped.showDatePill ? entry.grouped.datePillLabel : undefined
                          }
                          isGroupedWithPrevious={entry.grouped.isGroupedWithPrevious}
                          showTimestamp={entry.grouped.showTimestamp}
                          deliveryStatus={entry.grouped.message.deliveryStatus}
                          clientId={entry.grouped.message.clientId}
                          onRetry={handleRetryMessage}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {isPeerTyping ? <TypingIndicatorBubble senderName={peerName} /> : null}
            </>
          )}
        </div>
      )}

      {hasNewMessagesBelow ? (
        <div className="pointer-events-none absolute right-0 bottom-[68px] left-0 flex justify-center">
          <Button
            type="default"
            size="small"
            icon={<ArrowDownOutlined aria-hidden="true" />}
            className="pointer-events-auto rounded-full shadow-e1"
            onClick={scrollToBottom}
          >
            New messages
          </Button>
        </div>
      ) : null}

      <ChatInputBar
        conversationId={conversation.id}
        disabled={isLoadingInitial || messagesQuery.isError}
        onSendMessage={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
      />
    </div>
  );
}
