"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { SendOutlined } from "@ant-design/icons";
import { Button, Input, Tooltip } from "antd";

export const TYPING_START_DEBOUNCE_MS = 200;
export const TYPING_STOP_DEBOUNCE_MS = 1500;
export const MAX_MESSAGE_LENGTH = 2000;

export interface ChatInputBarProps {
  conversationId: number;
  disabled?: boolean;
  onSendMessage: (text: string) => void;
  onTypingStart: (conversationId: number) => void;
  onTypingStop: (conversationId: number) => void;
}

export function ChatInputBar({
  conversationId,
  disabled = false,
  onSendMessage,
  onTypingStart,
  onTypingStop,
}: ChatInputBarProps) {
  const [text, setText] = useState("");
  const typingStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingActiveRef = useRef(false);
  const onTypingStartRef = useRef(onTypingStart);
  const onTypingStopRef = useRef(onTypingStop);

  useEffect(() => {
    onTypingStartRef.current = onTypingStart;
  }, [onTypingStart]);

  useEffect(() => {
    onTypingStopRef.current = onTypingStop;
  }, [onTypingStop]);

  const clearTypingTimers = useCallback(() => {
    if (typingStartTimerRef.current !== null) {
      clearTimeout(typingStartTimerRef.current);
      typingStartTimerRef.current = null;
    }
    if (typingStopTimerRef.current !== null) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
  }, []);

  const stopTypingImmediately = useCallback(
    (targetConversationId: number) => {
      clearTypingTimers();
      if (isTypingActiveRef.current) {
        isTypingActiveRef.current = false;
        onTypingStopRef.current(targetConversationId);
      }
    },
    [clearTypingTimers],
  );

  // Stop typing and reset pending timers when changing conversations or unmounting
  useEffect(() => {
    return () => {
      stopTypingImmediately(conversationId);
    };
  }, [conversationId, stopTypingImmediately]);

  const scheduleTypingSignals = useCallback(
    (nextValue: string) => {
      if (nextValue.trim().length === 0) {
        stopTypingImmediately(conversationId);
        return;
      }

      if (!isTypingActiveRef.current && typingStartTimerRef.current === null) {
        typingStartTimerRef.current = setTimeout(() => {
          typingStartTimerRef.current = null;
          if (!isTypingActiveRef.current) {
            isTypingActiveRef.current = true;
            onTypingStartRef.current(conversationId);
          }
        }, TYPING_START_DEBOUNCE_MS);
      }

      if (typingStopTimerRef.current !== null) {
        clearTimeout(typingStopTimerRef.current);
      }
      typingStopTimerRef.current = setTimeout(() => {
        typingStopTimerRef.current = null;
        if (isTypingActiveRef.current) {
          isTypingActiveRef.current = false;
          onTypingStopRef.current(conversationId);
        }
      }, TYPING_STOP_DEBOUNCE_MS);
    },
    [conversationId, stopTypingImmediately],
  );

  const submitMessage = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) {
      return;
    }

    stopTypingImmediately(conversationId);
    setText("");
    onSendMessage(trimmed);
  }, [conversationId, disabled, onSendMessage, stopTypingImmediately, text]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submitMessage();
    }
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div className="border-t border-line bg-neutral-0 px-3 py-2 sm:px-4">
      <div className="flex min-h-[40px] items-end gap-2">
        <Input.TextArea
          aria-label="Message input"
          placeholder="Type a message"
          value={text}
          disabled={disabled}
          maxLength={MAX_MESSAGE_LENGTH}
          autoSize={{ minRows: 1, maxRows: 4 }}
          className="flex-1 rounded-md border-line-strong font-sans !text-[16px] leading-[22px] text-ink md:!text-[14px]"
          onChange={(event) => {
            const nextValue = event.target.value;
            setText(nextValue);
            scheduleTypingSignals(nextValue);
          }}
          onKeyDown={handleKeyDown}
        />

        <Tooltip title="Send message">
          <Button
            type="primary"
            icon={<SendOutlined aria-hidden="true" />}
            aria-label="Send message"
            disabled={!canSend}
            className="!h-11 !w-11 !min-h-[44px] !min-w-[44px] shrink-0 md:!h-10 md:!w-10 md:!min-h-[40px] md:!min-w-[40px]"
            onClick={submitMessage}
          />
        </Tooltip>
      </div>
    </div>
  );
}
