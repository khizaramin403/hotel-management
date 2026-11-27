"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createSocketClient,
  upsertConversationInCache,
  upsertMessageInCache,
  type ServerSocketHandler,
  type SocketClient,
} from "@/lib/socket";
import { useAppDispatch, useAppStore } from "@/store/hooks";
import { incrementConversationUnread, setConversationTyping } from "@/store/slices/chatSlice";

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

    activeClient.on("message:new", handleMessageNew);
    activeClient.on("typing", handleTyping);
    activeClient.on("conversation:updated", handleConversationUpdated);
    activeClient.connect();

    return () => {
      activeClient.off("message:new", handleMessageNew);
      activeClient.off("typing", handleTyping);
      activeClient.off("conversation:updated", handleConversationUpdated);
      activeClient.disconnect();
    };
  }, [activeClient, dispatch, queryClient, store]);

  return <SocketContext.Provider value={activeClient}>{children}</SocketContext.Provider>;
}

/** Returns the active SocketClient when logged in, or null for unauthenticated sessions. */
export function useSocket(): SocketClient | null {
  return useContext(SocketContext);
}
