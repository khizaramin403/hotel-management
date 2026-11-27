"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import {
  AudioMutedOutlined,
  AudioOutlined,
  CloseOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Tooltip } from "antd";
import { getUserInitials } from "@/components/layout/layoutUtils";
import { useSocket } from "@/providers/SocketProvider";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { selectAuthRole } from "@/store/slices/authSlice";
import {
  resetCall,
  selectCallConversationId,
  selectCallDirection,
  selectCallEndedDurationText,
  selectCallMuted,
  selectCallPeerName,
  selectCallStartedAt,
  selectCallStatus,
  type CallStatus,
} from "@/store/slices/callSlice";
import { formatCallDuration } from "../lib/callEngine";
import {
  acceptIncomingCallFlow,
  declineIncomingCallFlow,
  endActiveCallFlow,
  toggleCallMuteFlow,
} from "../lib/callSignaling";

export const CALL_ENDED_DISMISS_MS = 3000;

function useCallElapsedSeconds(status: CallStatus, startedAt: string | null): number {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (status !== "connected" || !startedAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [startedAt, status]);

  if (status !== "connected" || !startedAt) {
    return 0;
  }

  const startMs = Date.parse(startedAt);
  if (Number.isNaN(startMs)) {
    return 0;
  }

  return Math.max(0, Math.floor((nowMs - startMs) / 1000));
}

export function CallPopup() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const socket = useSocket();

  const status = useAppSelector(selectCallStatus);
  const conversationId = useAppSelector(selectCallConversationId);
  const direction = useAppSelector(selectCallDirection);
  const startedAt = useAppSelector(selectCallStartedAt);
  const peerNameFromState = useAppSelector(selectCallPeerName);
  const muted = useAppSelector(selectCallMuted);
  const endedDurationText = useAppSelector(selectCallEndedDurationText);
  const currentRole = useAppSelector(selectAuthRole);

  const elapsedSeconds = useCallElapsedSeconds(status, startedAt);

  useEffect(() => {
    if (status !== "ended") {
      return;
    }

    const timer = window.setTimeout(() => {
      dispatch(resetCall());
    }, CALL_ENDED_DISMISS_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [dispatch, status]);

  if (status === "idle" || conversationId === null) {
    return null;
  }

  const displayName =
    peerNameFromState ?? (currentRole === "guest" ? "Reception" : "Guest");

  const statusText =
    status === "ringing"
      ? direction === "incoming"
        ? "Incoming call..."
        : "Calling..."
      : status === "connected"
        ? `Connected ${formatCallDuration(elapsedSeconds)}`
        : `Call ended ${endedDurationText ?? "00:00"}`;

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      // Accessibility rule: Esc must never terminate an active or ringing call.
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Audio call with ${displayName}`}
      data-testid="call-popup"
      tabIndex={-1}
      onKeyDown={handleDialogKeyDown}
      className="fixed right-0 bottom-0 left-0 z-50 w-full rounded-t-lg border border-line bg-neutral-0 p-5 shadow-e2 sm:right-6 sm:bottom-6 sm:left-auto sm:w-[320px] sm:rounded-lg"
    >
      {status === "ended" ? (
        <div className="flex justify-end">
          <Tooltip title="Dismiss">
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined aria-hidden="true" />}
              aria-label="Dismiss call notice"
              onClick={() => dispatch(resetCall())}
            />
          </Tooltip>
        </div>
      ) : null}

      <div className="flex flex-col items-center text-center">
        <Avatar
          size={56}
          className="bg-green-100 font-sans text-[18px] font-semibold text-green-600"
        >
          {getUserInitials(displayName)}
        </Avatar>

        <div className="mt-3 font-sans text-[16px] font-semibold leading-[24px] text-ink">
          {displayName}
        </div>

        <div
          role="status"
          aria-live="polite"
          data-testid="call-status-text"
          className="mt-1 font-sans text-[13px] leading-[20px] tabular text-muted"
        >
          {statusText}
          {status === "connected" && muted ? " (Muted)" : ""}
        </div>

        {status === "ringing" && direction === "incoming" ? (
          <div className="mt-5 flex w-full items-center justify-center gap-3">
            <Button
              type="default"
              danger
              onClick={() => {
                void declineIncomingCallFlow({
                  conversationId,
                  dispatch,
                  getState: store.getState,
                  socket,
                });
              }}
            >
              Decline
            </Button>
            <Button
              type="primary"
              icon={<PhoneOutlined aria-hidden="true" />}
              onClick={() => {
                void acceptIncomingCallFlow({
                  conversationId,
                  dispatch,
                  getState: store.getState,
                  socket,
                });
              }}
            >
              Accept
            </Button>
          </div>
        ) : status === "ringing" && direction === "outgoing" ? (
          <div className="mt-5 flex items-center justify-center">
            <Tooltip title="End call">
              <Button
                type="primary"
                danger
                shape="circle"
                aria-label="End call"
                icon={<PhoneOutlined className="rotate-[135deg]" aria-hidden="true" />}
                className="!h-11 !w-11 !min-h-[44px] !min-w-[44px]"
                onClick={() => {
                  void endActiveCallFlow({
                    conversationId,
                    dispatch,
                    getState: store.getState,
                    socket,
                  });
                }}
              />
            </Tooltip>
          </div>
        ) : status === "connected" ? (
          <div className="mt-5 flex items-center justify-center gap-3">
            <Tooltip title={muted ? "Unmute" : "Mute"}>
              <Button
                type="default"
                aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                aria-pressed={muted}
                icon={
                  muted ? (
                    <AudioMutedOutlined aria-hidden="true" />
                  ) : (
                    <AudioOutlined aria-hidden="true" />
                  )
                }
                className={`!h-11 !w-11 !min-h-[44px] !min-w-[44px] ${
                  muted ? "!border-green-600 !bg-green-100 !text-green-600" : ""
                }`}
                onClick={() => toggleCallMuteFlow(dispatch, muted)}
              />
            </Tooltip>

            <Tooltip title="End call">
              <Button
                type="primary"
                danger
                shape="circle"
                aria-label="End call"
                icon={<PhoneOutlined className="rotate-[135deg]" aria-hidden="true" />}
                className="!h-11 !w-11 !min-h-[44px] !min-w-[44px]"
                onClick={() => {
                  void endActiveCallFlow({
                    conversationId,
                    dispatch,
                    getState: store.getState,
                    socket,
                  });
                }}
              />
            </Tooltip>
          </div>
        ) : null}
      </div>
    </div>
  );
}
