"use client";

import { useEffect } from "react";
import type { Conversation } from "@hotel/shared";
import { Skeleton } from "antd";
import { ErrorState, PageHeader } from "@/components/ui";
import { useAppDispatch } from "@/store/hooks";
import { setActiveConversation } from "@/store/slices/chatSlice";
import { useGuestConversationQuery } from "../hooks/useChatQueries";
import { ChatThread } from "./ChatThread";

export interface GuestChatViewProps {
  onCall?: (conversation: Conversation) => void;
}

function GuestChatSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading reception chat"
      className="flex h-[calc(100dvh-200px)] min-h-[460px] max-h-[760px] flex-col overflow-hidden rounded-lg border border-line bg-neutral-0"
    >
      <div className="flex h-16 items-center justify-between border-b border-line px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Skeleton.Avatar active size={40} />
          <div className="space-y-1.5">
            <Skeleton.Input active size="small" className="!h-4 !w-24" />
            <Skeleton.Input active size="small" className="!h-3 !w-14" />
          </div>
        </div>
        <Skeleton.Button active className="!h-10 !w-20" />
      </div>

      <div className="flex-1 space-y-4 bg-canvas p-4 md:p-6">
        <Skeleton.Input active className="!h-11 !w-56 !rounded-lg" />
        <div className="flex justify-end">
          <Skeleton.Input active className="!h-11 !w-64 !rounded-lg" />
        </div>
      </div>

      <div className="border-t border-line px-4 py-2">
        <Skeleton.Input active className="!h-10 !w-full" />
      </div>
    </div>
  );
}

export function GuestChatView({ onCall }: GuestChatViewProps) {
  const dispatch = useAppDispatch();
  const guestConvQuery = useGuestConversationQuery();

  useEffect(() => {
    return () => {
      dispatch(setActiveConversation(null));
    };
  }, [dispatch]);

  const isLoading =
    guestConvQuery.isPending || (guestConvQuery.isFetching && !guestConvQuery.data);

  return (
    <section
      aria-label="Reception chat"
      className="mx-auto max-w-container space-y-4 px-4 py-6 md:px-6"
    >
      <PageHeader title="Reception chat" variant="h1" />

      {isLoading ? (
        <GuestChatSkeleton />
      ) : guestConvQuery.isError || !guestConvQuery.data ? (
        <ErrorState
          variant="alert"
          title="Could not open chat"
          description="Check your connection and try again."
          onRetry={() => {
            void guestConvQuery.refetch();
          }}
        />
      ) : (
        <div className="flex h-[calc(100dvh-200px)] min-h-[460px] max-h-[760px] flex-col overflow-hidden rounded-lg border border-line bg-neutral-0">
          <ChatThread
            key={guestConvQuery.data.id}
            conversation={guestConvQuery.data}
            peerName="Reception"
            onCall={onCall}
          />
        </div>
      )}
    </section>
  );
}
