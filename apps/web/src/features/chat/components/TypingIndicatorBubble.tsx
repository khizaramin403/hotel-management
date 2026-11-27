"use client";

export interface TypingIndicatorBubbleProps {
  senderName: string;
}

export function TypingIndicatorBubble({ senderName }: TypingIndicatorBubbleProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${senderName} is typing`}
      className="flex justify-start pt-4"
    >
      <div className="inline-flex items-center gap-1.5 rounded-lg rounded-bl-sm border border-line bg-neutral-0 px-3 py-2.5">
        <span
          className="chat-typing-dot h-[5px] w-[5px] rounded-full bg-neutral-400"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="chat-typing-dot h-[5px] w-[5px] rounded-full bg-neutral-400"
          style={{ animationDelay: "180ms" }}
        />
        <span
          className="chat-typing-dot h-[5px] w-[5px] rounded-full bg-neutral-400"
          style={{ animationDelay: "360ms" }}
        />
      </div>
    </div>
  );
}
