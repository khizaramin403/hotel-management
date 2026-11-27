"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { getCallEngine } from "@/features/chat/lib/callEngine";
import {
  clearPendingCallOffers,
  finalizeCallEnded,
  handleAnsweredCallSocketEvent,
  handleIncomingCallSocketEvent,
  resolveCallPeerName,
} from "@/features/chat/lib/callSignaling";
import { observeBookingQueryNotifications } from "@/features/notifications/lib/bookingNotifications";
import {
  formatChatNotificationSnippet,
  resolveChatNotificationSender,
} from "@/features/notifications/lib/chatNotifications";
import {
  createSocketClient,
  upsertConversationInCache,
  upsertMessageInCache,
  type ServerSocketHandler,
  type SocketClient,
} from "@/lib/socket";
import { useAppDispatch, useAppStore } from "@/store/hooks";
import { incrementConversationUnread, setConversationTyping } from "@/store/slices/chatSlice";
import { addNotification } from "@/store/slices/notificationsSlice";

const MAX_SEEN_MESSAGE_IDS = 500;

export const SocketContext = createContext<SocketClient | null>(null);

export interface SocketProviderProps {
  children: ReactNode;
  client?: SocketClient;
}

export function SocketProvider({ children, client }: SocketProviderProps) {
  const [internalClient] = useState<SocketClient>(() => client ?? createSocketClient());
  const activeClient = client ?? internalClient;
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const queryClient = useQueryClient();
  const { notification } = App.useApp();
  const notificationRef = useRef(notification);

  useEffect(() => {
    notificationRef.current = notification;
  }, [notification]);

  useEffect(() => {
    const unsubscribeBookingNotifications = observeBookingQueryNotifications(
      queryClient,
      dispatch,
      store.getState,
    );

    return () => {
      unsubscribeBookingNotifications();
    };
  }, [dispatch, queryClient, store]);

  useEffect(() => {
    const seenMessageIds = new Set<number>();

    const handleMessageNew: ServerSocketHandler<"message:new"> = (message) => {
      const { wasAlreadyPresent } = upsertMessageInCache(queryClient, message);
      const isDuplicate = wasAlreadyPresent || seenMessageIds.has(message.id);

      seenMessageIds.add(message.id);
      if (seenMessageIds.size > MAX_SEEN_MESSAGE_IDS) {
        const oldest = seenMessageIds.values().next().value;
        if (oldest !== undefined) {
          seenMessageIds.delete(oldest);
        }
      }

      const state = store.getState();
      const currentUserId = state.auth.user?.id ?? null;
      const activeConversationId = state.chat.activeConversationId;

      if (
        !isDuplicate &&
        message.senderId !== currentUserId &&
        activeConversationId !== message.conversationId
      ) {
        dispatch(incrementConversationUnread(message.conversationId));

        const senderLabel = resolveChatNotificationSender(queryClient, message);
        const snippet = formatChatNotificationSnippet(message.text);

        dispatch(
          addNotification({
            id: `chat-msg-${message.id}`,
            type: "chat_message",
            text: `${senderLabel}: ${snippet}`,
            createdAt: message.createdAt,
          }),
        );

        notificationRef.current?.info?.({
          message: `New message from ${senderLabel}`,
          description: snippet,
          placement: "topRight",
          duration: 6,
        });
      }
    };

    const handleTyping: ServerSocketHandler<"typing"> = (payload) => {
      const currentUserId = store.getState().auth.user?.id ?? null;
      if (currentUserId !== null && payload.userId === currentUserId) {
        return;
      }

      dispatch(
        setConversationTyping({
          conversationId: payload.conversationId,
          isTyping: payload.isTyping,
        }),
      );
    };

    const handleConversationUpdated: ServerSocketHandler<"conversation:updated"> = (
      conversation,
    ) => {
      upsertConversationInCache(queryClient, conversation);
    };

    const handleCallIncoming: ServerSocketHandler<"call:incoming"> = (payload) => {
      const currentRole = store.getState().auth.user?.role;
      const peerName = resolveCallPeerName(queryClient, currentRole, payload.conversationId);
      handleIncomingCallSocketEvent({
        conversationId: payload.conversationId,
        sdp: payload.sdp,
        peerName,
        dispatch,
        getState: store.getState,
      });
    };

    const handleCallAnswered: ServerSocketHandler<"call:answered"> = (payload) => {
      void handleAnsweredCallSocketEvent({
        conversationId: payload.conversationId,
        sdp: payload.sdp,
        dispatch,
        getState: store.getState,
      });
    };

    const handleCallIce: ServerSocketHandler<"call:ice"> = (payload) => {
      if (store.getState().call.conversationId !== payload.conversationId) {
        return;
      }
      void getCallEngine().addIceCandidate(payload.candidate);
    };

    const handleCallTerminated: ServerSocketHandler<"call:ended"> = (payload) => {
      finalizeCallEnded({
        dispatch,
        getState: store.getState,
        conversationId: payload.conversationId,
      });
    };

    activeClient.on("message:new", handleMessageNew);
    activeClient.on("typing", handleTyping);
    activeClient.on("conversation:updated", handleConversationUpdated);
    activeClient.on("call:incoming", handleCallIncoming);
    activeClient.on("call:answered", handleCallAnswered);
    activeClient.on("call:ice", handleCallIce);
    activeClient.on("call:rejected", handleCallTerminated);
    activeClient.on("call:ended", handleCallTerminated);
    activeClient.connect();

    return () => {
      activeClient.off("message:new", handleMessageNew);
      activeClient.off("typing", handleTyping);
      activeClient.off("conversation:updated", handleConversationUpdated);
      activeClient.off("call:incoming", handleCallIncoming);
      activeClient.off("call:answered", handleCallAnswered);
      activeClient.off("call:ice", handleCallIce);
      activeClient.off("call:rejected", handleCallTerminated);
      activeClient.off("call:ended", handleCallTerminated);
      activeClient.disconnect();
      clearPendingCallOffers();
      getCallEngine().cleanup();
    };
  }, [activeClient, dispatch, queryClient, store]);

  return <SocketContext.Provider value={activeClient}>{children}</SocketContext.Provider>;
}

/** Returns the active SocketClient when logged in, or null for unauthenticated sessions. */
export function useSocket(): SocketClient | null {
  return useContext(SocketContext);
}
